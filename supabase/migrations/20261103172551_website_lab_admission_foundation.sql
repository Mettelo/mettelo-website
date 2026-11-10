-- Website V2 staging: reuse the pilot model; never grant members direct team writes.
begin;
create schema private_website_lab;
revoke all on schema private_website_lab from public,anon,authenticated;
create table private_website_lab.admins(user_id uuid primary key references auth.users(id),created_at timestamptz not null default now());
create table private_website_lab.audit(id bigint generated always as identity primary key,actor_id uuid not null,action text not null,team_id uuid,payload jsonb not null default '{}',created_at timestamptz not null default now());
alter table private_website_lab.admins enable row level security;
alter table private_website_lab.audit enable row level security;
revoke all on all tables in schema private_website_lab from public,anon,authenticated;
insert into private_website_lab.admins(user_id) select id from auth.users where lower(email)='taiwo.olaoluwaj@gmail.com' and email_confirmed_at is not null;

alter table public.website_project_teams add column participation text not null default 'team' check(participation in ('solo','team')),
 add column coordinator_id uuid references auth.users(id),
 add column two_person_reason text check(two_person_reason is null or length(btrim(two_person_reason)) between 8 and 500),
 add column two_person_approved_by uuid references auth.users(id),
 add column two_person_approved_at timestamptz,
 add column lab_enabled boolean not null default false;
alter table public.website_project_team_members drop constraint website_project_team_members_status_check,
 add constraint website_project_team_members_status_check check(status in ('offered','confirmed','declined','left')),
 add column project_ref text references public.website_project_briefs(project_ref),
 add column acknowledged_at timestamptz,
 add column access_verified_at timestamptz,
 add column access_verified_by uuid references auth.users(id);
update public.website_project_team_members m set project_ref=t.project_ref from public.website_project_teams t where t.id=m.team_id;
alter table public.website_project_team_members alter column project_ref set not null;
create unique index website_one_current_team_per_project on public.website_project_team_members(user_id,project_ref) where status in ('offered','confirmed');

-- Stop the earlier headcount-only trigger from activating teams.
create or replace function public.website_reconcile_pilot_teams(p_project_ref text) returns void language plpgsql security definer set search_path='' as $$
begin return; end $$;

create or replace function public.website_validate_pilot_member() returns trigger language plpgsql security definer set search_path='' as $$
declare team public.website_project_teams; choice text; filled integer;
begin
 select * into team from public.website_project_teams where id=new.team_id for update;
 if not found then raise exception 'Team not found';end if;
 perform pg_advisory_xact_lock(hashtextextended(team.project_ref,0));
 if tg_op='UPDATE' and (new.team_id<>old.team_id or new.user_id<>old.user_id or new.interest_id<>old.interest_id or new.project_ref<>old.project_ref) then raise exception 'Membership identity is immutable';end if;
 select i.participation into choice from public.website_project_interests i join auth.users u on u.id=i.user_id
 where i.id=new.interest_id and i.user_id=new.user_id and i.project_ref=team.project_ref and u.email_confirmed_at is not null;
 if choice is null or new.project_ref<>team.project_ref then raise exception 'A matching verified project interest is required';end if;
 if choice<>'flexible' and choice<>team.participation then raise exception 'Offer must respect the submitted working arrangement';end if;
 if not exists(select 1 from public.website_project_briefs b where b.project_ref=team.project_ref and b.roles ? new.role) then raise exception 'Select a valid project role';end if;
 if new.status in ('offered','confirmed') then
  if team.status not in ('forming','active') or not team.accepting_members then raise exception 'Team is not accepting members';end if;
  select count(*) into filled from public.website_project_team_members where team_id=team.id and user_id<>new.user_id and status in ('offered','confirmed');
  if filled>=(case when team.participation='solo' then 1 else 4 end) then raise exception 'Team capacity reached';end if;
 end if;
 if new.status='confirmed' and new.acknowledged_at is null then raise exception 'Member acceptance is required';end if;
 return new;
end $$;

create or replace function public.website_validate_pilot_team() returns trigger language plpgsql security definer set search_path='' as $$
declare required integer; filled integer; capacity integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.project_ref,0));
 if tg_op='UPDATE' and new.participation<>old.participation and exists(select 1 from public.website_project_team_members where team_id=new.id) then raise exception 'Cannot change the arrangement of an allocated team';end if;
 if new.minimum_members<>(case when new.participation='solo' then 1 else 3 end) then raise exception 'Normal minimum is three for teams and one for solo';end if;
 if new.participation='solo' and new.two_person_reason is not null then raise exception 'Two-person exception is for teams only';end if;
 if new.two_person_reason is not null and (new.two_person_approved_by is null or new.two_person_approved_at is null) then raise exception 'Exception approval must be recorded';end if;
 if exists(select 1 from unnest(new.required_roles) r where not exists(select 1 from public.website_project_briefs b where b.project_ref=new.project_ref and b.roles ? r)) then raise exception 'Required role is not in this project';end if;
 if new.status='active' and (tg_op='INSERT' or old.status<>'active') then
  required:=case when new.participation='solo' then 1 when new.two_person_reason is not null then 2 else 3 end;
  select count(*) into filled from public.website_project_team_members where team_id=new.id and status='confirmed';
  if filled<required or filled>(case when new.participation='solo' then 1 else 4 end) then raise exception 'Team size is not ready';end if;
  if not new.lab_enabled then raise exception 'Lab transfer is not ready for this team';end if;
  if not exists(select 1 from public.website_project_team_members where team_id=new.id and user_id=new.coordinator_id and status='confirmed') then raise exception 'A confirmed coordinator is required';end if;
  if exists(select 1 from public.website_project_team_members where team_id=new.id and status='confirmed' and (acknowledged_at is null or access_verified_at is null)) then raise exception 'Confirm member acceptance and repository access';end if;
  if exists(select 1 from unnest(new.required_roles) r where not exists(select 1 from public.website_project_team_members where team_id=new.id and status='confirmed' and role=r)) then raise exception 'Required roles are not filled';end if;
  select max_active_teams into capacity from public.website_project_pilot_settings where project_ref=new.project_ref;
  if (select count(*) from public.website_project_teams where project_ref=new.project_ref and status='active' and id<>new.id)>=capacity then raise exception 'Active team capacity reached';end if;
  new.started_at:=coalesce(new.started_at,now());
 end if;
 return new;
end $$;

-- One private authority, reached through a non-definer API wrapper. Reads omit contacts.
create function private_website_lab.control(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid:=auth.uid(); admin boolean; t public.website_project_teams; m public.website_project_team_members;
 interest public.website_project_interests; tid uuid; result jsonb; role_name text; reason text;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 select exists(select 1 from private_website_lab.admins where user_id=actor) into admin;
 if p_action='access' then return jsonb_build_object('allowed',admin);end if;
 if p_action='mine' then
  return coalesce((select jsonb_agg(jsonb_build_object('team_id',t.id,'project_ref',t.project_ref,'title',b.title,'label',t.label,'team_status',t.status,'participation',t.participation,'role',m.role,'membership_status',m.status,'lab_enabled',t.lab_enabled,'minimum',case when t.participation='solo' then 1 when t.two_person_reason is not null then 2 else 3 end,'confirmed',(select count(*) from public.website_project_team_members x where x.team_id=t.id and x.status='confirmed'),'access_verified',m.access_verified_at is not null) order by t.created_at desc) from public.website_project_team_members m join public.website_project_teams t on t.id=m.team_id join public.website_project_briefs b on b.project_ref=t.project_ref where m.user_id=actor and m.status in ('offered','confirmed')),'[]');
 end if;
 if p_action='respond' then
  tid:=(p_payload->>'team_id')::uuid;
  select * into t from public.website_project_teams where id=tid for update;
  select * into m from public.website_project_team_members where team_id=tid and user_id=actor for update;
  if m.user_id is null or m.status<>'offered' or t.status not in ('forming','active') then raise exception 'This offer is no longer pending';end if;
  if p_payload->>'response' not in ('accept','decline') or p_payload->>'response' is null then raise exception 'Choose accept or decline';end if;
  update public.website_project_team_members set status=case when p_payload->>'response'='accept' then 'confirmed' else 'declined' end,acknowledged_at=case when p_payload->>'response'='accept' then now() else null end where team_id=tid and user_id=actor;
 elsif not admin then raise exception 'Project administrator access required' using errcode='42501';
 elsif p_action='list' then
  return jsonb_build_object('projects',(select jsonb_agg(jsonb_build_object('ref',project_ref,'title',title,'roles',roles) order by project_ref) from public.website_project_briefs),
   'interests',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'project_ref',i.project_ref,'user_id',i.user_id,'name',coalesce(p.full_name,'Member'),'participation',i.participation,'role',i.primary_role,'motivation',i.motivation,'contribution',i.contribution,'answers',i.answers,'submitted_at',i.submitted_at) order by i.submitted_at desc) from public.website_project_interests i left join public.profiles p on p.id=i.user_id),'[]'),
   'teams',coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'status',m.status,'accepted',m.acknowledged_at is not null,'access_verified',m.access_verified_at is not null,'name',coalesce(p.full_name,'Member'))) from public.website_project_team_members m left join public.profiles p on p.id=m.user_id where m.team_id=t.id),'[]')) order by t.created_at desc) from public.website_project_teams t),'[]'));
 elsif p_action='create' then
  if coalesce(length(btrim(p_payload->>'label')),0) not between 3 and 80 or coalesce(p_payload->>'participation','') not in ('solo','team') then raise exception 'Enter a team reference and arrangement';end if;
  insert into public.website_project_teams(project_ref,label,participation,minimum_members,required_roles) values(p_payload->>'project_ref',btrim(p_payload->>'label'),p_payload->>'participation',case when p_payload->>'participation'='solo' then 1 else 3 end,array(select jsonb_array_elements_text(coalesce(p_payload->'required_roles','[]')))) returning id into tid;
 elsif p_action='offer' then
  tid:=(p_payload->>'team_id')::uuid;
  select * into t from public.website_project_teams where id=tid for update;
  select * into interest from public.website_project_interests where id=(p_payload->>'interest_id')::uuid;
  if t.id is null or interest.id is null or interest.project_ref<>t.project_ref then raise exception 'Select an interest in this project';end if;
  role_name:=p_payload->>'role';
  insert into public.website_project_team_members(team_id,interest_id,user_id,project_ref,role,status) values(t.id,interest.id,interest.user_id,t.project_ref,role_name,'offered');
 elsif p_action in ('coordinator','verify_access','allow_two','start') then
  tid:=(p_payload->>'team_id')::uuid;
  select * into t from public.website_project_teams where id=tid for update;
  if t.id is null then raise exception 'Team not found';end if;
  if p_action='coordinator' then
   if not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=(p_payload->>'user_id')::uuid and status='confirmed') then raise exception 'Choose a confirmed member';end if;
   update public.website_project_teams set coordinator_id=(p_payload->>'user_id')::uuid where id=tid;
  elsif p_action='verify_access' then
   reason:=btrim(coalesce(p_payload->>'reason',''));
   if length(reason) not between 8 and 500 then raise exception 'Record how repository access was verified';end if;
   update public.website_project_team_members set access_verified_at=now(),access_verified_by=actor where team_id=tid and user_id=(p_payload->>'user_id')::uuid and status='confirmed';
   if not found then raise exception 'Choose a confirmed member';end if;
  elsif p_action='allow_two' then
   if t.status<>'forming' or t.participation<>'team' then raise exception 'Two-person exception is only for a forming team';end if;
   reason:=btrim(coalesce(p_payload->>'reason',''));
   if length(reason) not between 8 and 500 then raise exception 'Record a reason for the two-person exception';end if;
   if (select count(*) from public.website_project_team_members where team_id=tid and status='confirmed')<>2 then raise exception 'Exactly two members must accept their places first';end if;
   update public.website_project_teams set two_person_reason=reason,two_person_approved_by=actor,two_person_approved_at=now() where id=tid;
  else
   if t.status='active' then return jsonb_build_object('already_started',true);end if;
   if t.status<>'forming' then raise exception 'Only a forming team can start';end if;
   update public.website_project_teams set status='active' where id=tid;
  end if;
 else raise exception 'Unsupported project action';end if;
 insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,tid,p_payload);
 return jsonb_build_object('ok',true,'team_id',tid);
end $$;
revoke all on function private_website_lab.control(text,jsonb) from public,anon,authenticated;
grant usage on schema private_website_lab to authenticated;
grant execute on function private_website_lab.control(text,jsonb) to authenticated;
create function public.website_lab(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private_website_lab.control(p_action,p_payload) $$;
revoke all on function public.website_lab(text,jsonb) from public,anon;
grant execute on function public.website_lab(text,jsonb) to authenticated;
commit;
