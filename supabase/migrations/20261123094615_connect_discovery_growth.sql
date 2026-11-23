-- The same live account/block rules serve both single-account checks and
-- set-based directory queries. Nothing here caches or weakens revocation.
do $guard$
declare account_rule text:=pg_get_functiondef('private_website_lab.account_allowed(uuid)'::regprocedure);block_rule text:=pg_get_functiondef('private_website_lab.market_blocked(uuid,uuid)'::regprocedure);
begin
 if strpos(account_rule,'u.deleted_at is null')=0 or strpos(account_rule,'u.banned_until<=now()')=0 or strpos(account_rule,'a.suspended')=0 or strpos(block_rule,'blocker_id=a and blocked_id=b')=0 or strpos(block_rule,'blocker_id=b and blocked_id=a')=0 then raise exception 'Account/block policy changed; review before adapting discovery';end if;
end $guard$;
create view private_website_lab.allowed_accounts with(security_invoker=true) as
 select u.id from auth.users u where u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and not exists(select 1 from private_website_lab.member_access a where a.user_id=u.id and a.suspended);
create view private_website_lab.market_block_pairs with(security_invoker=true) as
 select blocker_id as actor_id,blocked_id as member_id from private_website_lab.market_blocks
 union all select blocked_id,blocker_id from private_website_lab.market_blocks;
revoke all on private_website_lab.allowed_accounts,private_website_lab.market_block_pairs from public,anon,authenticated;
create or replace function private_website_lab.account_allowed(uid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private_website_lab.allowed_accounts a where a.id=uid)$$;
create or replace function private_website_lab.market_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private_website_lab.market_block_pairs x where x.actor_id=a and x.member_id=b)$$;
create index website_profile_discovery_order on public.profiles((lower(coalesce(full_name,username,''))),id);
create index website_profile_connections_order on public.profiles(full_name,id);

do $adapt$
declare src text;start_pos integer;end_pos integer;old_branch text;
begin
 src:=pg_get_functiondef('private_website_lab.market(text,jsonb)'::regprocedure);
 start_pos:=strpos(src,'elsif p_action=''people'' then');end_pos:=strpos(src,'elsif p_action=''projects'' then');
 if start_pos=0 or end_pos<=start_pos then raise exception 'Expected people directory branch missing';end if;
 old_branch:=substring(src from start_pos for end_pos-start_pos);
 src:=replace(src,old_branch,$people$
elsif p_action='people' then
  return (with eligible as materialized (
   select p.id from public.profiles p join private_website_lab.market_preferences s on s.user_id=p.id join private_website_lab.allowed_accounts a on a.id=p.id
   where s.discoverable
    and (coalesce(p_payload->>'area','')='' or (s.share_details and p.professional_area ilike '%'||left(p_payload->>'area',120)||'%'))
    and (coalesce(p_payload->>'experience','')='' or (s.share_details and p.experience_level=left(p_payload->>'experience',100)))
    and not exists(select 1 from private_website_lab.market_block_pairs x where x.actor_id=actor and x.member_id=p.id)
    and (q='' or concat_ws(' ',p.full_name,p.username,p.headline,p.skills::text,case when s.share_details then concat_ws(' ',p.professional_area,p.technical_interests,p.preferred_roles,p.weekly_availability,p.problem_interests) end,case when s.share_location then p.location end) ilike '%'||q||'%')
  ), page_rows as (
   select p.id,p.username,p.full_name,p.headline,p.skills,s.contactable from eligible e join public.profiles p on p.id=e.id join private_website_lab.market_preferences s on s.user_id=p.id
   order by lower(coalesce(p.full_name,p.username,'')),p.id limit 25 offset (pg-1)*25
  ) select jsonb_build_object('page',pg,'page_size',25,'total',(select count(*) from eligible),'rows',coalesce((select jsonb_agg(to_jsonb(x) order by lower(coalesce(x.full_name,x.username,'')),x.id) from (
   select p.id,p.username,p.full_name,p.headline,array(select btrim(skill) from unnest(string_to_array(coalesce(p.skills,''),','))skill where btrim(skill)<>'') skills,p.contactable,
    exists(select 1 from private_website_lab.market_follows f where f.follower_id=actor and f.followed_id=p.id) following from page_rows p
  )x),'[]')));
 $people$);
 -- Keep the legacy project endpoint consistent with unified discovery too.
 if strpos(src,'where s.open and t.status=')=0 then raise exception 'Expected legacy discovery project filter missing';end if;
 src:=replace(src,'where s.open and t.status=','where b.archived_at is null and s.open and t.status=');
 execute src;

 src:=pg_get_functiondef('private_website_lab.market_discovery(text,jsonb)'::regprocedure);
 start_pos:=strpos(src,'elsif p_action=''connections'' then');end_pos:=strpos(src,'elsif p_action=''profile'' then');
 if start_pos=0 or end_pos<=start_pos then raise exception 'Expected member connections branch missing';end if;
 old_branch:=substring(src from start_pos for end_pos-start_pos);
 src:=replace(src,old_branch,$connections$
elsif p_action='connections' then
  if target is null or not private_website_lab.account_allowed(target) or (target<>actor and (private_website_lab.market_blocked(actor,target) or not exists(select 1 from private_website_lab.market_preferences s where s.user_id=target and s.discoverable))) then raise exception 'Member connections unavailable' using errcode='42501';end if;
  with visible as materialized (
   select p.id,'followers'::text direction from private_website_lab.market_follows f join public.profiles p on p.id=f.follower_id join private_website_lab.market_preferences s on s.user_id=p.id join private_website_lab.allowed_accounts a on a.id=p.id
   where f.followed_id=target and s.discoverable
    and not exists(select 1 from private_website_lab.market_block_pairs x where x.actor_id in(actor,target) and x.member_id=p.id)
   union all
   select p.id,'following'::text direction from private_website_lab.market_follows f join public.profiles p on p.id=f.followed_id join private_website_lab.market_preferences s on s.user_id=p.id join private_website_lab.allowed_accounts a on a.id=p.id
   where f.follower_id=target and s.discoverable
    and not exists(select 1 from private_website_lab.market_block_pairs x where x.actor_id in(actor,target) and x.member_id=p.id)
  ), page_rows as (
   select p.id,p.full_name,p.username,p.headline,v.direction from visible v join public.profiles p on p.id=v.id
   where v.direction=case when p_payload->>'direction'='following' then 'following' else 'followers' end
   order by p.full_name nulls last,p.id limit 25 offset (greatest(1,least(10000,coalesce(nullif(p_payload->>'page','')::integer,1)))-1)*25
  ) select jsonb_build_object('followers',(select count(*) from visible where direction='followers'),'following',(select count(*) from visible where direction='following'),
   'rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.full_name nulls last,x.id) from(select p.*,exists(select 1 from private_website_lab.market_follows mine where mine.follower_id=actor and mine.followed_id=p.id) following from page_rows p)x),'[]'::jsonb)) into result;
  return result;
 $connections$);
 execute src;
end $adapt$;
