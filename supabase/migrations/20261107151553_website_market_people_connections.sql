begin;
do $adapt$
declare src text;needle text := ' if p_action=''profile'' then';branch text;
begin
 src:=pg_get_functiondef('private_website_lab.market_discovery(text,jsonb)'::regprocedure);
 if strpos(src,needle)=0 then raise exception 'Discovery dispatcher changed';end if;
 branch:=$branch$ if p_action='avatar' then
  select jsonb_build_object('path',p.avatar_path) into result from public.profiles p
  where p.id=target and private_website_lab.account_allowed(p.id)
   and (p.id=actor or (exists(select 1 from private_website_lab.market_preferences s where s.user_id=p.id and s.discoverable) and not private_website_lab.market_blocked(actor,p.id)));
  return coalesce(result,'{}'::jsonb);
 elsif p_action='suggestions' then
  select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) into result from (
   select p.id,p.full_name,p.username,p.headline,false following
   from public.profiles p join private_website_lab.market_preferences s on s.user_id=p.id
   where s.discoverable and p.id<>actor and private_website_lab.account_allowed(p.id)
    and not private_website_lab.market_blocked(actor,p.id)
    and not exists(select 1 from private_website_lab.market_follows f where f.follower_id=actor and f.followed_id=p.id)
   order by p.full_name nulls last,p.id limit 3
  )x;return result;
 elsif p_action='connections' then
  if target is null or not private_website_lab.account_allowed(target) or (target<>actor and (private_website_lab.market_blocked(actor,target) or not exists(select 1 from private_website_lab.market_preferences s where s.user_id=target and s.discoverable))) then
   raise exception 'Member connections unavailable' using errcode='42501';end if;
  with visible as materialized (
   select p.id,p.full_name,p.username,p.headline,'followers' direction,
    exists(select 1 from private_website_lab.market_follows mine where mine.follower_id=actor and mine.followed_id=p.id) following
   from private_website_lab.market_follows f join public.profiles p on p.id=f.follower_id join private_website_lab.market_preferences s on s.user_id=p.id
   where f.followed_id=target and s.discoverable and private_website_lab.account_allowed(p.id) and not private_website_lab.market_blocked(actor,p.id) and not private_website_lab.market_blocked(target,p.id)
   union all
   select p.id,p.full_name,p.username,p.headline,'following' direction,
    exists(select 1 from private_website_lab.market_follows mine where mine.follower_id=actor and mine.followed_id=p.id) following
   from private_website_lab.market_follows f join public.profiles p on p.id=f.followed_id join private_website_lab.market_preferences s on s.user_id=p.id
   where f.follower_id=target and s.discoverable and private_website_lab.account_allowed(p.id) and not private_website_lab.market_blocked(actor,p.id) and not private_website_lab.market_blocked(target,p.id)
  ), page_rows as (
   select * from visible where direction=case when p_payload->>'direction'='following' then 'following' else 'followers' end
   order by full_name nulls last,id limit 25 offset (greatest(1,least(10000,coalesce(nullif(p_payload->>'page','')::integer,1)))-1)*25
  )
  select jsonb_build_object('followers',(select count(*) from visible where direction='followers'),'following',(select count(*) from visible where direction='following'),'rows',coalesce((select jsonb_agg(to_jsonb(x)) from page_rows x),'[]'::jsonb)) into result;
  return result;
 elsif p_action='profile' then$branch$;
 execute replace(src,needle,branch);
end $adapt$;
create policy website_market_shared_photo_read on storage.objects for select to authenticated
using (bucket_id='website-profile-photos' and
 case when name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' then
 name=(public.website_market_discovery('avatar',jsonb_build_object('member_id',split_part(name,'/',1)))->>'path')
 else false end);
commit;
