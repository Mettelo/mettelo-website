begin;
-- Market admission uses the same canonical membership/access rows and slot guard.
-- The route remains explicit; original formation/readiness counts only core members.
alter table public.website_project_team_members add column admission_route text not null default 'core' check(admission_route in ('core','market'));
alter table public.website_project_team_members alter column interest_id drop not null;
alter table public.website_project_team_members add constraint membership_application_route check(admission_route='market' or interest_id is not null);
create table private_website_lab.market_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 discoverable boolean not null default false,
 contactable boolean not null default false,
 updated_at timestamptz not null default now()
);
create table private_website_lab.market_recruitment(
 team_id uuid primary key references public.website_project_teams(id),
 collaborator_capacity integer not null default 0 check(collaborator_capacity between 0 and 12),
 open boolean not null default false,
 description text not null default '' check(length(description)<=2000),
 roles text[] not null default '{}',
 skills text[] not null default '{}',
 commitment text not null default '' check(length(commitment)<=300),
 updated_at timestamptz not null default now()
);
create table private_website_lab.market_requests(
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.website_project_teams(id),
 member_id uuid not null references auth.users(id),
 kind text not null check(kind in ('request','invitation')),
 initiated_by uuid not null references auth.users(id),
 role text not null check(length(role) between 1 and 120),
 proposal text not null check(length(proposal) between 10 and 2000),
 commitment text not null check(length(commitment) between 3 and 300),
 state text not null default 'pending' check(state in ('pending','accepted','declined','withdrawn','expired','cancelled')),
 expires_at timestamptz not null default now()+interval '14 days',
 decided_by uuid references auth.users(id),
 decided_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index market_one_pending on private_website_lab.market_requests(team_id,member_id) where state='pending';
create index market_requests_recipient on private_website_lab.market_requests(member_id,created_at desc,id);
create index market_requests_team on private_website_lab.market_requests(team_id,state,created_at desc,id);
alter table public.website_project_team_members add column market_request_id uuid unique references private_website_lab.market_requests(id);
alter table public.website_project_team_members add constraint market_request_required check(admission_route='core' or market_request_id is not null);
alter table private_website_lab.market_preferences enable row level security;
alter table private_website_lab.market_recruitment enable row level security;
alter table private_website_lab.market_requests enable row level security;
revoke all on private_website_lab.market_preferences,private_website_lab.market_recruitment,private_website_lab.market_requests from public,anon,authenticated;

create function private_website_lab.market_leader(tid uuid,uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private_website_lab.account_allowed(uid) and exists(select 1 from public.website_project_teams t join public.website_project_team_members m on m.team_id=t.id and m.user_id=uid where t.id=tid and t.coordinator_id=uid and t.status='active' and t.lab_enabled and m.admission_route='core' and m.status='confirmed' and m.admitted_at is not null)
$$;
create function private_website_lab.market_occupied(tid uuid) returns integer language sql stable security definer set search_path='' as $$
 select count(*)::integer from public.website_project_team_members m join public.website_project_teams t on t.id=m.team_id where m.team_id=tid and m.admission_route='market' and private_website_lab.participation_kind(m.status,t.status,m.offer_expires_at,m.admitted_at,m.access_verified_at,m.external_access_revoked_at) is not null
$$;

-- Check every Market membership write, including calls through older admin functions.
create function private_website_lab.validate_market_membership(m public.website_project_team_members) returns void language plpgsql security definer set search_path='' as $$
declare t public.website_project_teams;r private_website_lab.market_requests;cap integer;
begin
 select * into t from public.website_project_teams where id=m.team_id for update;
 if m.project_ref is distinct from t.project_ref or m.interest_id is not null then raise exception 'Market membership must preserve its independent admission route';end if;
 if not exists(select 1 from public.website_project_briefs b where b.project_ref=t.project_ref and b.roles ? m.role) or m.responsibilities is distinct from array[m.role] then raise exception 'Choose one approved collaboration role';end if;
 if m.status in ('left','declined') then return;end if;
 select * into r from private_website_lab.market_requests where id=m.market_request_id;
 if r.id is null or r.team_id<>m.team_id or r.member_id<>m.user_id or r.state<>'accepted' or r.role<>m.role or r.decided_by is null then raise exception 'An accepted collaboration decision is required' using errcode='42501';end if;
 if t.status<>'active' or not t.lab_enabled or m.status<>'confirmed' or m.acknowledged_at is null or m.commitment_confirmed_at is null or m.admitted_at is null then raise exception 'Active Lab and explicit collaboration consent required';end if;
 if not exists(select 1 from auth.users where id=m.user_id and email_confirmed_at is not null) or not private_website_lab.account_allowed(m.user_id) or exists(select 1 from private_website_lab.placement_restrictions where user_id=m.user_id and project_ref=m.project_ref and cleared_at is null) then raise exception 'Member is not eligible for this Lab' using errcode='42501';end if;
 select collaborator_capacity into cap from private_website_lab.market_recruitment where team_id=t.id;
 if (select count(*) from public.website_project_team_members x where x.team_id=t.id and x.user_id<>m.user_id and x.admission_route='market' and private_website_lab.participation_kind(x.status,t.status,x.offer_expires_at,x.admitted_at,x.access_verified_at,x.external_access_revoked_at) is not null)>=coalesce(cap,0) then raise exception 'Collaboration capacity reached';end if;
end $$;

do $adapt$
declare src text;
begin
 src:=pg_get_functiondef('public.website_validate_pilot_member()'::regprocedure);
 src:=replace(src,E'begin\n',E'begin\n if tg_op=''UPDATE'' and (new.admission_route is distinct from old.admission_route or new.market_request_id is distinct from old.market_request_id) then raise exception ''Admission route is immutable'';end if;\n if new.admission_route=''market'' then\n  if tg_op=''UPDATE'' and (new.team_id<>old.team_id or new.user_id<>old.user_id or new.project_ref<>old.project_ref or new.interest_id is distinct from old.interest_id or (old.status=''confirmed'' and new.status=''confirmed'' and new.responsibilities is distinct from old.responsibilities)) then raise exception ''Market membership identity and accepted responsibilities are immutable'';end if;\n  perform private_website_lab.validate_market_membership(new);return new;\n end if;\n');
 src:=replace(src,$replace$where team_id=team.id and user_id<>new.user_id and status in ('offered','confirmed')$replace$,$replace$where team_id=team.id and user_id<>new.user_id and admission_route='core' and status in ('offered','confirmed')$replace$);
 execute src;
 src:=pg_get_functiondef('public.website_validate_pilot_team()'::regprocedure);
 src:=replace(src,$replace$where team_id=new.id and status='confirmed'$replace$,$replace$where team_id=new.id and admission_route='core' and status='confirmed'$replace$);
 src:=replace(src,$replace$and user_id=new.coordinator_id and status='confirmed'$replace$,$replace$and user_id=new.coordinator_id and admission_route='core' and status='confirmed'$replace$);
 execute src;
 src:=pg_get_functiondef('private_website_lab.readiness(uuid)'::regprocedure);
 src:=replace(src,$replace$where team_id=tid and status=$replace$,$replace$where team_id=tid and admission_route='core' and status=$replace$);
 src:=replace(src,$replace$and user_id=t.coordinator_id and status='confirmed'$replace$,$replace$and user_id=t.coordinator_id and admission_route='core' and status='confirmed'$replace$);
 execute src;
 src:=pg_get_functiondef('private_website_lab.admission(text,jsonb)'::regprocedure);
 src:=replace(src,'join public.website_project_interests i on i.id=m.interest_id','left join public.website_project_interests i on i.id=m.interest_id');
 src:=replace(src,$replace$where team_id=tid and user_id=uid and status='confirmed'$replace$,$replace$where team_id=tid and user_id=uid and admission_route='core' and status='confirmed'$replace$);
 execute src;
 src:=pg_get_functiondef('private_website_lab.operations_before_participation_policy(text,jsonb)'::regprocedure);
 src:=replace(src,'join public.website_project_interests i on i.id=m.interest_id','left join public.website_project_interests i on i.id=m.interest_id');
 src:=replace(src,$replace$jsonb_build_object('requested_participation',i.participation$replace$,$replace$jsonb_build_object('admission_route',m.admission_route,'requested_participation',i.participation$replace$);
 execute src;
end $adapt$;

create function private_website_lab.market(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid();tid uuid:=nullif(p_payload->>'team_id','')::uuid;target uuid:=nullif(p_payload->>'member_id','')::uuid;rid uuid:=nullif(p_payload->>'request_id','')::uuid;r private_website_lab.market_requests;t public.website_project_teams;lead boolean;staff boolean;result jsonb;pg integer:=greatest(1,least(100000,coalesce((p_payload->>'page')::integer,1)));q text:=left(btrim(coalesce(p_payload->>'q','')),150);cap integer;chosen_role text;desired text;changed boolean;scope uuid[];
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not private_website_lab.account_allowed(actor) then raise exception 'Verified account access required' using errcode='42501';end if;
 staff:=private_website_lab.permitted(actor,'operations');
 if p_action='preferences' then
  if p_payload ? 'discoverable' then insert into private_website_lab.market_preferences(user_id,discoverable,contactable) values(actor,(p_payload->>'discoverable')::boolean,(p_payload->>'contactable')::boolean) on conflict(user_id) do update set discoverable=excluded.discoverable,contactable=excluded.contactable,updated_at=now();end if;
  return coalesce((select to_jsonb(x)-'user_id' from private_website_lab.market_preferences x where user_id=actor),'{"discoverable":false,"contactable":false}');
 elsif p_action='people' then
  return jsonb_build_object('page',pg,'page_size',25,'total',(select count(*) from public.profiles p join private_website_lab.market_preferences s on s.user_id=p.id where s.discoverable and private_website_lab.account_allowed(p.id) and (q='' or concat_ws(' ',p.full_name,p.username,p.headline,p.skills::text) ilike '%'||q||'%')),'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select p.id,p.username,p.full_name,p.headline,p.skills,s.contactable from public.profiles p join private_website_lab.market_preferences s on s.user_id=p.id where s.discoverable and private_website_lab.account_allowed(p.id) and (q='' or concat_ws(' ',p.full_name,p.username,p.headline,p.skills::text) ilike '%'||q||'%') order by lower(coalesce(p.full_name,p.username,'')),p.id limit 25 offset (pg-1)*25) x),'[]'));
 elsif p_action='projects' then
  return jsonb_build_object('page',pg,'page_size',25,'total',(select count(*) from private_website_lab.market_recruitment s join public.website_project_teams t on t.id=s.team_id join public.website_project_briefs b on b.project_ref=t.project_ref where s.open and t.status='active' and t.lab_enabled and private_website_lab.market_occupied(t.id)<s.collaborator_capacity and (q='' or concat_ws(' ',b.title,b.project_ref,s.roles::text,s.skills::text) ilike '%'||q||'%')),'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select t.id team_id,t.project_ref,b.title,s.description,s.roles,s.skills,s.commitment,s.collaborator_capacity-private_website_lab.market_occupied(t.id) available,'Mettelo project' origin from private_website_lab.market_recruitment s join public.website_project_teams t on t.id=s.team_id join public.website_project_briefs b on b.project_ref=t.project_ref where s.open and t.status='active' and t.lab_enabled and private_website_lab.market_occupied(t.id)<s.collaborator_capacity and (q='' or concat_ws(' ',b.title,b.project_ref,s.roles::text,s.skills::text) ilike '%'||q||'%') order by s.updated_at desc,t.id limit 25 offset (pg-1)*25) x),'[]'));
 elsif p_action='my_labs' then
  return coalesce((select jsonb_agg(jsonb_build_object('team_id',t.id,'label',t.label,'project_ref',t.project_ref,'title',b.title)) from public.website_project_teams t join public.website_project_briefs b on b.project_ref=t.project_ref where private_website_lab.market_leader(t.id,actor)),'[]');
 elsif p_action='inbox' then
  return jsonb_build_object('page',pg,'page_size',25,'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select r.id,r.team_id,r.kind,r.member_id,r.role,r.proposal,r.commitment,case when r.state='pending' and r.expires_at<=now() then 'expired' else r.state end state,r.expires_at,r.created_at,b.title,coalesce(p.full_name,'Member') member_name,private_website_lab.market_leader(r.team_id,actor) can_manage from private_website_lab.market_requests r join public.website_project_teams t on t.id=r.team_id join public.website_project_briefs b on b.project_ref=t.project_ref left join public.profiles p on p.id=r.member_id where r.member_id=actor or private_website_lab.market_leader(r.team_id,actor) order by r.created_at desc,r.id limit 25 offset (pg-1)*25) x),'[]'));
 end if;
 if rid is not null then select * into r from private_website_lab.market_requests where id=rid;tid:=r.team_id;target:=r.member_id;end if;
 -- Always acquire the shared participant lock before Lab/request locks.
 select array_agg(distinct uid order by uid) into scope from (select actor uid union select target union select user_id from public.website_project_team_members where team_id=tid) x;
 perform private_website_lab.participation_locks(scope);
 select * into t from public.website_project_teams where id=tid for update;
 if t.id is null then raise exception 'Lab not found';end if;
 if rid is not null then select * into r from private_website_lab.market_requests where id=rid for update;end if;
 lead:=private_website_lab.market_leader(tid,actor);
 if p_action='capacity' then
  if not staff then raise exception 'Project administrator required' using errcode='42501';end if;
  cap:=(p_payload->>'capacity')::integer;
  if cap is null or cap not between 0 and 12 or cap<private_website_lab.market_occupied(tid) then raise exception 'Capacity cannot be below occupied collaboration seats';end if;
  insert into private_website_lab.market_recruitment(team_id,collaborator_capacity) values(tid,cap) on conflict(team_id) do update set collaborator_capacity=excluded.collaborator_capacity,updated_at=now();
 elsif p_action='recruitment' then
  if not lead then raise exception 'Active official owner or coordinator required' using errcode='42501';end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(p_payload->'roles','[]')) x where not exists(select 1 from public.website_project_briefs b where b.project_ref=t.project_ref and b.roles ? x)) then raise exception 'Choose approved project roles';end if;
  update private_website_lab.market_recruitment set open=coalesce((p_payload->>'open')::boolean,false),description=btrim(p_payload->>'description'),commitment=btrim(p_payload->>'commitment'),roles=array(select jsonb_array_elements_text(p_payload->'roles')),skills=array(select jsonb_array_elements_text(coalesce(p_payload->'skills','[]'))),updated_at=now() where team_id=tid and collaborator_capacity>0;
  if not found then raise exception 'An administrator must set collaboration capacity first';end if;
 elsif p_action='manage' then
  if not lead and not staff then raise exception 'Lab management access required' using errcode='42501';end if;
  return jsonb_build_object('team_id',tid,'can_manage',lead,'can_set_capacity',staff,'catalogue_roles',(select roles from public.website_project_briefs where project_ref=t.project_ref),'recruitment',(select to_jsonb(s) from private_website_lab.market_recruitment s where s.team_id=tid),'occupied',private_website_lab.market_occupied(tid),'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',p.full_name,'role',m.role,'status',m.status,'revocation_pending',m.status='left' and m.access_verified_at is not null and m.external_access_revoked_at is null)) from public.website_project_team_members m left join public.profiles p on p.id=m.user_id where m.team_id=tid and m.admission_route='market'),'[]'));
 elsif p_action in ('request','invite') then
  if t.status<>'active' or not t.lab_enabled then raise exception 'Only active Labs can recruit';end if;
  if p_action='invite' and not lead then raise exception 'Only the official project leader may invite' using errcode='42501';end if;
  if p_action='request' then target:=actor;end if;
  if target is null or target=t.coordinator_id or not exists(select 1 from auth.users where id=target and email_confirmed_at is not null) or not private_website_lab.account_allowed(target) then raise exception 'Eligible member required';end if;
  if p_action='invite' and not exists(select 1 from private_website_lab.market_preferences where user_id=target and discoverable and contactable) then raise exception 'This member is not accepting invitations' using errcode='42501';end if;
  chosen_role:=btrim(p_payload->>'role');
  if not exists(select 1 from private_website_lab.market_recruitment where team_id=tid and open and chosen_role=any(roles) and collaborator_capacity>private_website_lab.market_occupied(tid)) then raise exception 'This collaboration role is not recruiting';end if;
  if exists(select 1 from public.website_project_team_members where team_id=tid and user_id=target and status in ('offered','confirmed')) then raise exception 'Member already has a place in this Lab';end if;
  update private_website_lab.market_requests set state='expired' where team_id=tid and member_id=target and state='pending' and expires_at<=now();
  insert into private_website_lab.market_requests(team_id,member_id,kind,initiated_by,role,proposal,commitment) values(tid,target,case when p_action='invite' then 'invitation' else 'request' end,actor,chosen_role,btrim(p_payload->>'proposal'),btrim(p_payload->>'commitment')) returning id into rid;
  perform private_website_lab.notify_member(case when p_action='invite' then target else t.coordinator_id end,'market-request:'||rid,'A collaboration '||case when p_action='invite' then 'invitation' else 'request' end||' is ready','/member/market?tab=requests');
 elsif p_action in ('accept','decline','withdraw') then
  if r.id is null then raise exception 'Collaboration request not found';end if;
  if p_action='withdraw' then
   if r.initiated_by<>actor then raise exception 'Only the sender can withdraw' using errcode='42501';end if;
  elsif (r.kind='request' and not lead) or (r.kind='invitation' and r.member_id<>actor) then raise exception 'Only the recipient or authorised project leader may decide' using errcode='42501';end if;
  if r.state='accepted' and p_action='accept' then
   if not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=target and market_request_id=r.id and status='confirmed') then raise exception 'This collaboration was subsequently removed';end if;
   return jsonb_build_object('ok',true,'already_accepted',true,'team_id',tid);
  end if;
  if r.state<>'pending' or r.expires_at<=now() then raise exception 'This request is no longer pending';end if;
  desired:=case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'withdrawn' end;
  if p_action='accept' then
   if t.status<>'active' or not t.lab_enabled or not private_website_lab.market_leader(tid,t.coordinator_id) or not private_website_lab.account_allowed(target) then raise exception 'Active Lab and eligible participants required';end if;
   if r.kind='invitation' and r.initiated_by<>t.coordinator_id then raise exception 'The inviting leader has changed; request a new invitation';end if;
   if not exists(select 1 from private_website_lab.market_recruitment where team_id=tid and open and r.role=any(roles) and collaborator_capacity>private_website_lab.market_occupied(tid)) then raise exception 'Collaboration capacity or advertised role is unavailable';end if;
   perform private_website_lab.assert_participation_slot(target,tid);
   update private_website_lab.market_requests set state='accepted',decided_by=actor,decided_at=now() where id=rid;
   insert into public.website_project_team_members(team_id,user_id,project_ref,role,responsibilities,status,acknowledged_at,commitment_confirmed_at,admitted_at,onboarding_checked_at,admission_route,market_request_id) values(tid,target,t.project_ref,r.role,array[r.role],'confirmed',now(),now(),now(),now(),'market',rid);
  else update private_website_lab.market_requests set state=desired,decided_by=actor,decided_at=now() where id=rid;end if;
  perform private_website_lab.notify_member(target,'market-decision:'||rid||':'||desired,'Your collaboration request is '||desired,'/member/market?tab=requests');
  perform private_website_lab.notify_member(t.coordinator_id,'market-leader-decision:'||rid||':'||desired,'Collaboration '||desired,'/member/market?tab=requests');
 elsif p_action='remove' then
  if not lead and not staff and actor<>target then raise exception 'Collaborator removal is not permitted' using errcode='42501';end if;
  if length(btrim(coalesce(p_payload->>'reason',''))) not between 8 and 500 then raise exception 'Record a removal reason';end if;
  if not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=target and admission_route='market' and status='confirmed') then raise exception 'Current Market collaboration required';end if;
  update private_website_lab.items set owner_id=t.coordinator_id where team_id=tid and owner_id=target and kind in ('task','milestone') and status<>'done';
  update public.website_project_team_members set status='left',admitted_at=null,onboarding_checked_at=null where team_id=tid and user_id=target and admission_route='market';
  update private_website_lab.mail_outbox set state='cancelled' where user_id=target and state in ('pending','failed') and meeting_id in(select id from private_website_lab.meetings where team_id=tid);
  perform private_website_lab.notify_member(target,'market-removed:'||tid||':'||clock_timestamp(),'Your collaboration access has ended','/member/lab');
 else raise exception 'Unsupported Market action';end if;
 insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,'market_'||p_action,tid,jsonb_build_object('request_id',rid,'member_id',target,'reason',left(p_payload->>'reason',500)));
 return jsonb_build_object('ok',true,'team_id',tid,'request_id',rid);
end $$;
revoke all on function private_website_lab.market_leader(uuid,uuid),private_website_lab.market_occupied(uuid),private_website_lab.validate_market_membership(public.website_project_team_members),private_website_lab.market(text,jsonb) from public,anon,authenticated;
grant execute on function private_website_lab.market(text,jsonb) to authenticated;
create function public.website_lab_market(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.market(p_action,p_payload)$$;
revoke all on function public.website_lab_market(text,jsonb) from public,anon;
grant execute on function public.website_lab_market(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
