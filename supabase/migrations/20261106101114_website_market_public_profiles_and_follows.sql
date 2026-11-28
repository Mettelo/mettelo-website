begin;
alter table private_website_lab.market_preferences add column share_details boolean not null default false,add column share_location boolean not null default false,add column notify_community boolean not null default true,add column notify_messages boolean not null default true;
create table private_website_lab.market_project_follows(user_id uuid not null references auth.users(id) on delete cascade,project_ref text not null references public.website_project_briefs(project_ref),created_at timestamptz not null default now(),primary key(user_id,project_ref));
create index market_project_follows_ref on private_website_lab.market_project_follows(project_ref,user_id);
alter table private_website_lab.market_project_follows enable row level security;
revoke all on private_website_lab.market_project_follows from public,anon,authenticated;
create function private_website_lab.market_discovery(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid:=auth.uid();target uuid:=nullif(p_payload->>'member_id','')::uuid;tid uuid:=nullif(p_payload->>'team_id','')::uuid;ref text:=p_payload->>'project_ref';result jsonb;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not private_website_lab.account_allowed(actor) then raise exception 'Verified account access required' using errcode='42501';end if;
 if p_action='profile' then
  select jsonb_build_object('id',p.id,'full_name',p.full_name,'username',p.username,'headline',p.headline,'skills',array(select btrim(s) from unnest(string_to_array(coalesce(p.skills,''),','))s where btrim(s)<>''),'contactable',s.contactable,
  'bio',case when s.share_details then p.bio end,'professional_area',case when s.share_details then p.professional_area end,'experience_level',case when s.share_details then p.experience_level end,'technical_interests',case when s.share_details then p.technical_interests end,'preferred_roles',case when s.share_details then p.preferred_roles end,'weekly_availability',case when s.share_details then p.weekly_availability end,'problem_interests',case when s.share_details then p.problem_interests end,'location',case when s.share_location then p.location end,
  'following',exists(select 1 from private_website_lab.market_follows f where f.follower_id=actor and f.followed_id=p.id)) into result
  from public.profiles p join private_website_lab.market_preferences s on s.user_id=p.id where p.id=target and s.discoverable and private_website_lab.account_allowed(p.id) and not private_website_lab.market_blocked(actor,p.id);
  if result is null then raise exception 'Member profile unavailable' using errcode='42501';end if;
  return result;
 elsif p_action='project' then
  select jsonb_build_object('team_id',t.id,'project_ref',t.project_ref,'title',b.title,'stage',t.status,'origin',case when exists(select 1 from private_website_lab.market_proposals p where p.project_ref=t.project_ref and p.state='approved') then 'Approved member project' else 'Mettelo project' end,
   'description',s.description,'roles',s.roles,'skills',s.skills,'commitment',s.commitment,'available',greatest(0,s.collaborator_capacity-private_website_lab.market_occupied(t.id)),
   'leader',jsonb_build_object('id',t.coordinator_id,'name',coalesce(pr.full_name,pr.username,'Project leader'),'contactable',coalesce(pref.contactable,false)),
   'following',exists(select 1 from private_website_lab.market_project_follows f where f.user_id=actor and f.project_ref=t.project_ref),
   'highlights',coalesce((select jsonb_agg(to_jsonb(x)) from(select p.id,p.kind,left(p.body,300) body,p.created_at from private_website_lab.market_posts p where p.team_id=t.id and private_website_lab.market_post_visible(p.id,actor) order by p.created_at desc,p.id desc limit 3)x),'[]')) into result
  from public.website_project_teams t join public.website_project_briefs b on b.project_ref=t.project_ref join private_website_lab.market_recruitment s on s.team_id=t.id left join public.profiles pr on pr.id=t.coordinator_id left join private_website_lab.market_preferences pref on pref.user_id=t.coordinator_id
  where t.id=tid and t.status='active' and t.lab_enabled and s.open and private_website_lab.market_leader(t.id,t.coordinator_id) and not private_website_lab.market_blocked(actor,t.coordinator_id);
  if result is null then raise exception 'Recruitment listing unavailable' using errcode='42501';end if;return result;
 elsif p_action='follow_project' then
  if not exists(select 1 from public.website_project_briefs where project_ref=ref) then raise exception 'Approved project required';end if;
  perform private_website_lab.participation_locks(array[actor]);
  if coalesce((p_payload->>'enabled')::boolean,true) then insert into private_website_lab.market_project_follows(user_id,project_ref) values(actor,ref) on conflict do nothing;
  else delete from private_website_lab.market_project_follows where user_id=actor and project_ref=ref;end if;
  return jsonb_build_object('ok',true);
 else raise exception 'Unsupported discovery action';end if;
end $$;
revoke all on function private_website_lab.market_discovery(text,jsonb) from public,anon;
grant execute on function private_website_lab.market_discovery(text,jsonb) to authenticated;
create function public.website_market_discovery(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private_website_lab.market_discovery(p_action,p_payload) $$;
revoke all on function public.website_market_discovery(text,jsonb) from public,anon;
grant execute on function public.website_market_discovery(text,jsonb) to authenticated;
do $adapt$declare src text;begin
 src:=pg_get_functiondef('private_website_lab.market(text,jsonb)'::regprocedure);
 src:=replace(src,'market_preferences(user_id,discoverable,contactable) values(actor,(p_payload->>''discoverable'')::boolean,(p_payload->>''contactable'')::boolean)',
 'market_preferences(user_id,discoverable,contactable,share_details,share_location,notify_community,notify_messages) values(actor,(p_payload->>''discoverable'')::boolean,(p_payload->>''contactable'')::boolean,coalesce((p_payload->>''share_details'')::boolean,false),coalesce((p_payload->>''share_location'')::boolean,false),coalesce((p_payload->>''notify_community'')::boolean,true),coalesce((p_payload->>''notify_messages'')::boolean,true))');
 src:=replace(src,'contactable=excluded.contactable,updated_at=now()','contactable=excluded.contactable,share_details=excluded.share_details,share_location=excluded.share_location,notify_community=excluded.notify_community,notify_messages=excluded.notify_messages,updated_at=now()');
 src:=replace(src,$needle$p.headline,p.skills,s.contactable$needle$,$replacement$p.headline,array(select btrim(skill) from unnest(string_to_array(coalesce(p.skills,''),','))skill where btrim(skill)<>'') skills,s.contactable$replacement$);
 src:=replace(src,'s.discoverable and not private_website_lab.market_blocked(actor,p.id)',
 's.discoverable and (coalesce(p_payload->>''area'','''')='''' or (s.share_details and p.professional_area ilike ''%''||left(p_payload->>''area'',120)||''%'')) and (coalesce(p_payload->>''experience'','''')='''' or (s.share_details and p.experience_level=left(p_payload->>''experience'',100))) and not private_website_lab.market_blocked(actor,p.id)');
 src:=replace(src,$needle$p.headline,p.skills::text) ilike$needle$,$replacement$p.headline,p.skills::text,case when s.share_details then concat_ws(' ',p.professional_area,p.technical_interests,p.preferred_roles,p.weekly_availability,p.problem_interests) end,case when s.share_location then p.location end) ilike$replacement$);
 execute src;
 src:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 src:=replace(src,$needle$f.followed_id=p.author_id))$needle$,$replacement$f.followed_id=p.author_id) or exists(select 1 from private_website_lab.market_project_follows f where f.user_id=actor and f.project_ref=p.project_ref))$replacement$);
 src:=replace(src,$needle$elsif p_action in ('like','bookmark') then$needle$,$replacement$elsif p_action in ('like','bookmark') then$replacement$);
 -- Notify a parent comment's author separately from the main post author.
 src:=replace(src,$needle$elsif p_action in ('like','bookmark') then$needle$,$replacement$if parent is not null then perform private_website_lab.notify_member((select c.author_id from private_website_lab.market_comments c where c.id=parent and c.author_id<>actor and c.author_id<>(select p.author_id from private_website_lab.market_posts p where p.id=pid)),'market-reply:'||comment_id,'A new reply to your Market comment','/member/market/community?post='||pid);end if;
 elsif p_action in ('like','bookmark') then$replacement$);
 -- Project updates are explicitly shared posts, never private Lab items.
 src:=replace(src,$needle$if p_action in ('publish','comment') then$needle$,$replacement$if p_action='publish' and ref is not null then
  for mention in select f.user_id id from private_website_lab.market_project_follows f where f.project_ref=ref and f.user_id<>actor and not private_website_lab.market_blocked(f.user_id,actor) limit 10000 loop
   perform private_website_lab.notify_member(mention.id,'market-followed-post:'||pid,'A project you follow has a public update','/member/market/community?post='||pid);
  end loop;
 end if;
 if p_action in ('publish','comment') then$replacement$);
 execute src;
end $adapt$;
create or replace function private_website_lab.notify_member(uid uuid,event text,title text,href text,team uuid default null) returns void language sql security definer set search_path='' as $$
 insert into private_website_lab.notifications(recipient_id,event_key,title,href,team_id)
 select uid,event,title,href,team where uid is not null and
 (event not like 'market-comment:%' and event not like 'market-reply:%' and event not like 'market-mention:%' and event not like 'market-followed-post:%' or coalesce((select notify_community from private_website_lab.market_preferences where user_id=uid),true)) and
 (event not like 'market-dm:%' or coalesce((select notify_messages from private_website_lab.market_preferences where user_id=uid),true))
 on conflict(recipient_id,event_key) do nothing
$$;
commit;
