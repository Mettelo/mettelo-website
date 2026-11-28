-- Pilot formation workflow, staging only. Existing records are preserved.
begin;
create table private_website_lab.interest_reviews(
 interest_id uuid primary key references public.website_project_interests(id),
 status text not null check(status in ('new','clarification','shortlisted','declined','withdrawn')),
 note text not null default '' check(length(note)<=1500),reviewer_id uuid not null,updated_at timestamptz not null default now()
);
alter table private_website_lab.interest_reviews enable row level security;
revoke all on private_website_lab.interest_reviews from public,anon,authenticated;
alter table public.website_project_pilot_settings add column member_capacity integer not null default 4 check(member_capacity between 3 and 12);
alter table public.website_project_teams add column maximum_members integer not null default 4 check(maximum_members between 3 and 12),
 add column coordinator_nominee_id uuid references auth.users(id),add column coordinator_agreed_at timestamptz;
alter table public.website_project_team_members add column offer_expires_at timestamptz,
 add column commitment_confirmed_at timestamptz;
-- Preserve historical appointments without inventing member agreement timestamps.
update public.website_project_teams set coordinator_nominee_id=coordinator_id where coordinator_id is not null;

create function private_website_lab.readiness(tid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.website_project_teams; filled integer; checks jsonb; need integer;
begin
 select * into t from public.website_project_teams where id=tid;
 if t.id is null then raise exception 'Placement not found';end if;
 need:=case when t.participation='solo' then 1 when t.two_person_reason is not null then 2 else 3 end;
 select count(*) into filled from public.website_project_team_members where team_id=tid and status='confirmed';
 checks:=jsonb_build_array(
 jsonb_build_object('label',case when t.participation='solo' then 'Solo owner accepted' else 'Required members accepted' end,'ready',filled>=need and filled<=case when t.participation='solo' then 1 else t.maximum_members end),
 jsonb_build_object('label','No unanswered offers','ready',not exists(select 1 from public.website_project_team_members where team_id=tid and status='offered')),
 jsonb_build_object('label','Essential responsibilities covered','ready',not exists(select 1 from unnest(t.required_roles) r where not exists(select 1 from public.website_project_team_members where team_id=tid and status='confirmed' and role=r))),
 jsonb_build_object('label',case when t.participation='solo' then 'Solo ownership confirmed' else 'Coordinator agreed' end,'ready',exists(select 1 from public.website_project_team_members where team_id=tid and user_id=t.coordinator_id and status='confirmed') and (t.participation='solo' or t.coordinator_agreed_at is not null)),
 jsonb_build_object('label','Working commitments confirmed','ready',filled>0 and not exists(select 1 from public.website_project_team_members where team_id=tid and status='confirmed' and commitment_confirmed_at is null)),
 jsonb_build_object('label','Repository access checked','ready',filled>0 and not exists(select 1 from public.website_project_team_members where team_id=tid and status='confirmed' and access_verified_at is null)),
 jsonb_build_object('label','Lab prepared','ready',t.lab_enabled),
 jsonb_build_object('label','Milestones assigned','ready',exists(select 1 from private_website_lab.items where team_id=tid and kind='milestone') and not exists(select 1 from private_website_lab.items i where i.team_id=tid and i.kind='milestone' and not exists(select 1 from public.website_project_team_members m where m.team_id=tid and m.status='confirmed' and m.user_id=i.owner_id))),
 jsonb_build_object('label','Two-person agreement, if needed','ready',t.two_person_reason is null or not exists(select 1 from public.website_project_team_members where team_id=tid and status='confirmed' and two_person_agreed_at is null)));
 return jsonb_build_object('checks',checks,'ready',not exists(select 1 from jsonb_array_elements(checks) x where (x->>'ready')::boolean is not true));
end $$;
revoke all on function private_website_lab.readiness(uuid) from public,anon,authenticated;

-- Update existing capacity guards without changing their other safety checks.
do $upgrade$
declare source text;
begin
 source:=pg_get_functiondef('public.website_validate_pilot_member()'::regprocedure);
 if strpos(source,'then 1 else 4 end')=0 then raise exception 'Unexpected member capacity guard';end if;
 source:=replace(source,'then 1 else 4 end','then 1 else team.maximum_members end');
 source:=replace(source,'if new.status in (''offered'',''confirmed'') then','if new.status in (''offered'',''confirmed'') and (tg_op=''INSERT'' or old.status is distinct from new.status) then');execute source;
 source:=pg_get_functiondef('public.website_validate_pilot_team()'::regprocedure);
 if strpos(source,'then 1 else 4 end')=0 then raise exception 'Unexpected team capacity guard';end if;
 source:=replace(source,'then 1 else 4 end','then 1 else new.maximum_members end');execute source;
end $upgrade$;

create function private_website_lab.admission(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid:=auth.uid(); admin boolean; t public.website_project_teams; m public.website_project_team_members; i public.website_project_interests;
 tid uuid; result jsonb; row jsonb; person jsonb; chosen jsonb; a text; reason text; ref text; nominee uuid; cap integer; n integer; uid uuid; expiry timestamptz;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 select exists(select 1 from private_website_lab.admins where user_id=actor) into admin;
 if p_action='access' then return jsonb_build_object('allowed',admin);
 elsif p_action='formation_list' then
  if not admin then raise exception 'Project administrator access required' using errcode='42501';end if;
  result:=private_website_lab.control('list','{}');
  result:=jsonb_set(result,'{interests}',coalesce((select jsonb_agg(x||jsonb_build_object('review_status',coalesce(r.status,'new'),'review_note',coalesce(r.note,''),'profile',jsonb_build_object('headline',p.headline,'experience_level',p.experience_level,'skills',p.skills,'weekly_availability',p.weekly_availability))) from jsonb_array_elements(result->'interests') x left join private_website_lab.interest_reviews r on r.interest_id=(x->>'id')::uuid left join public.profiles p on p.id=(x->>'user_id')::uuid),'[]'));
  result:=jsonb_set(result,'{projects}',coalesce((select jsonb_agg(x||jsonb_build_object('member_capacity',s.member_capacity)) from jsonb_array_elements(result->'projects') x join public.website_project_pilot_settings s on s.project_ref=x->>'ref'),'[]'));
  result:=jsonb_set(result,'{teams}',coalesce((select jsonb_agg(x||jsonb_build_object('readiness',private_website_lab.readiness((x->>'id')::uuid),'members',coalesce((select jsonb_agg(y||jsonb_build_object('offer_expires_at',m.offer_expires_at,'commitment_confirmed',m.commitment_confirmed_at is not null,'two_person_agreed',m.two_person_agreed_at is not null)) from jsonb_array_elements(x->'members') y join public.website_project_team_members m on m.team_id=(x->>'id')::uuid and m.user_id=(y->>'user_id')::uuid),'[]'))) from jsonb_array_elements(result->'teams') x),'[]'));
  return result||'{"workflow_version":2}'::jsonb;
 elsif p_action='mine' then
  result:=private_website_lab.control('mine','{}');
  return coalesce((select jsonb_agg(x||jsonb_build_object('offer_availability',i.answers->>'availability','offer_collaboration',i.answers->>'collaboration_availability','offer_time_zone',i.answers->>'time_zone','is_nominee',t.coordinator_nominee_id=actor,'coordinator_agreed',t.coordinator_agreed_at is not null,'offer_expires_at',m.offer_expires_at,'commitment_confirmed',m.commitment_confirmed_at is not null)) from jsonb_array_elements(result) x join public.website_project_teams t on t.id=(x->>'team_id')::uuid join public.website_project_team_members m on m.team_id=t.id and m.user_id=actor join public.website_project_interests i on i.id=m.interest_id),'[]');
 elsif p_action in ('respond','confirm_commitment','agree_coordinator') then
  tid:=(p_payload->>'team_id')::uuid;select * into t from public.website_project_teams where id=tid for update;
  select * into m from public.website_project_team_members where team_id=tid and user_id=actor for update;
  if m.user_id is null then raise exception 'Your placement is required' using errcode='42501';end if;
  if p_action='respond' then
   if m.status<>'offered' or (m.offer_expires_at is not null and m.offer_expires_at<=now()) then raise exception 'This offer is no longer available; ask Mettelo to review it';end if;
   if p_payload->>'response'='accept' and p_payload->>'commitment_confirmed' is distinct from 'true' then raise exception 'Confirm the role and working commitment before accepting';end if;
   result:=private_website_lab.control('respond',p_payload);
   if p_payload->>'response'='accept' then
    update public.website_project_team_members set commitment_confirmed_at=now() where team_id=tid and user_id=actor;
    if t.participation='solo' then update public.website_project_teams set coordinator_id=actor where id=tid;end if;
   end if;
   return result;
  end if;
  if m.status<>'confirmed' or t.status not in ('forming','paused','active') then raise exception 'A current accepted place is required';end if;
  if p_action='confirm_commitment' then
   update public.website_project_team_members set commitment_confirmed_at=now() where team_id=tid and user_id=actor;
   if t.participation='solo' then update public.website_project_teams set coordinator_id=actor where id=tid;end if;
  else
   if t.participation<>'team' or t.coordinator_nominee_id is distinct from actor then raise exception 'Only the nominated coordinator may agree' using errcode='42501';end if;
   update public.website_project_teams set coordinator_id=actor,coordinator_agreed_at=now() where id=tid;
  end if;
 elsif not admin then raise exception 'Project administrator access required' using errcode='42501';
 elsif p_action='review_interest' then
  select * into i from public.website_project_interests where id=(p_payload->>'interest_id')::uuid;
  if i.id is null then raise exception 'Application not found';end if;
  a:=p_payload->>'review_status';reason:=btrim(coalesce(p_payload->>'reason',''));
  if a not in ('new','clarification','shortlisted','declined','withdrawn') or a is null or length(reason)>1500 then raise exception 'Choose a valid review status and note';end if;
  if a in ('clarification','declined','withdrawn') and length(reason)<8 then raise exception 'Record a short reason for this decision';end if;
  if a in ('declined','withdrawn') and exists(select 1 from public.website_project_team_members where interest_id=i.id and status in ('offered','confirmed')) then raise exception 'Release the existing placement before closing this application';end if;
  insert into private_website_lab.interest_reviews(interest_id,status,note,reviewer_id) values(i.id,a,reason,actor) on conflict(interest_id) do update set status=a,note=reason,reviewer_id=actor,updated_at=now();
 elsif p_action='form_group' then
  ref:=p_payload->>'project_ref';a:=p_payload->>'participation';chosen:=p_payload->'members';
  if a not in ('solo','team') or a is null or jsonb_typeof(chosen) is distinct from 'array' then raise exception 'Choose an arrangement and applicants';end if;
  if p_payload->>'compatibility_reviewed' is distinct from 'true' then raise exception 'Review schedule, roles and working arrangements before forming';end if;
  perform pg_advisory_xact_lock(hashtextextended(ref,0));
  select member_capacity into cap from public.website_project_pilot_settings where project_ref=ref for update;
  n:=jsonb_array_length(chosen);
  if cap is null or n<(case when a='solo' then 1 when p_payload->>'two_person_exception'='true' and length(btrim(coalesce(p_payload->>'reason',''))) between 8 and 500 then 2 else 3 end) or n>(case when a='solo' then 1 else cap end) then raise exception 'Choose one solo owner or a team within project capacity';end if;
  if (select count(distinct x->>'interest_id') from jsonb_array_elements(chosen) x)<>n then raise exception 'Each applicant must be selected once';end if;
  nominee:=nullif(p_payload->>'nominee_id','')::uuid;
  expiry:=now()+make_interval(days=>coalesce(nullif(p_payload->>'offer_days','')::integer,7));
  if expiry<now()+interval '1 day' or expiry>now()+interval '30 days' then raise exception 'Offer deadline must be 1 to 30 days';end if;
  for person in select * from jsonb_array_elements(chosen) loop
   select * into i from public.website_project_interests where id=(person->>'interest_id')::uuid and project_ref=ref for update;
   if i.id is null or not exists(select 1 from private_website_lab.interest_reviews where interest_id=i.id and status='shortlisted') then raise exception 'Every applicant must be shortlisted';end if;
   if i.participation not in (a,'flexible') or i.answers->>'commitment_response'='no' then raise exception 'Review the applicant working preference and commitment';end if;
   if exists(select 1 from public.website_project_team_members where user_id=i.user_id and project_ref=ref and status in ('offered','confirmed')) then raise exception 'An applicant already has an offer or place; refresh the proposals';end if;
   if not exists(select 1 from public.website_project_briefs where project_ref=ref and roles ? (person->>'role')) then raise exception 'Choose a valid project role for each applicant';end if;
   if i.user_id=nominee and coalesce(i.answers->>'coordination_preference',case when i.answers->>'leadership_interest'='true' then 'interested_with_support' else '' end) not in ('comfortable','interested_with_support') then raise exception 'Nominate someone who volunteered to coordinate';end if;
  end loop;
  if a='team' and (nominee is null or not exists(select 1 from public.website_project_interests where id in (select (x->>'interest_id')::uuid from jsonb_array_elements(chosen) x) and user_id=nominee)) then raise exception 'Nominate a selected coordinator candidate';end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(p_payload->'required_roles','[]')) as required(value) where not exists(select 1 from jsonb_array_elements(chosen) x where x->>'role'=required.value)) then raise exception 'Cover the essential responsibilities';end if;
  result:=private_website_lab.control('create',p_payload);tid:=(result->>'team_id')::uuid;
  update public.website_project_teams set maximum_members=cap,coordinator_nominee_id=case when a='team' then nominee else null end where id=tid;
  if a='team' and n=2 then update public.website_project_teams set two_person_reason=btrim(p_payload->>'reason'),two_person_approved_by=actor,two_person_approved_at=now() where id=tid;end if;
  for person in select * from jsonb_array_elements(chosen) loop
   perform private_website_lab.control('offer',jsonb_build_object('team_id',tid,'interest_id',person->>'interest_id','role',person->>'role'));
   update public.website_project_team_members set offer_expires_at=expiry where team_id=tid and interest_id=(person->>'interest_id')::uuid;
  end loop;
 elsif p_action='offer' then
  select * into i from public.website_project_interests where id=(p_payload->>'interest_id')::uuid;
  if i.id is null or not exists(select 1 from private_website_lab.interest_reviews where interest_id=i.id and status='shortlisted') or i.answers->>'commitment_response'='no' then raise exception 'Shortlist an available applicant first';end if;
  tid:=(p_payload->>'team_id')::uuid;select * into t from public.website_project_teams where id=tid for update;
  if t.status not in ('forming','paused') then raise exception 'Pause a running team before adding a replacement';end if;
  if t.status='paused' then update public.website_project_teams set status='forming',accepting_members=true where id=tid;end if;
  insert into public.website_project_team_members(team_id,interest_id,user_id,project_ref,role,status) values(tid,i.id,i.user_id,t.project_ref,p_payload->>'role','offered')
   on conflict(team_id,user_id) do update set role=excluded.role,status='offered',acknowledged_at=null,access_verified_at=null,access_verified_by=null,commitment_confirmed_at=null,two_person_agreed_at=null where website_project_team_members.status in ('declined','left');
  if not found then raise exception 'This applicant already has a current offer or placement';end if;
  update public.website_project_team_members set offer_expires_at=now()+interval '7 days' where team_id=tid and interest_id=i.id;
 elsif p_action='nominate_coordinator' then
  tid:=(p_payload->>'team_id')::uuid;uid:=(p_payload->>'user_id')::uuid;
  select * into t from public.website_project_teams where id=tid for update;
  if t.participation<>'team' or not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=uid and status='confirmed') then raise exception 'Nominate an accepted team member';end if;
  reason:=btrim(coalesce(p_payload->>'reason',''));if length(reason) not between 8 and 500 then raise exception 'Record why this member is being nominated';end if;
  -- A nomination is only a request; the member must agree before authority changes.
  if t.status='active' then update public.website_project_teams set status='paused' where id=tid;end if;
  update public.website_project_teams set coordinator_nominee_id=uid,coordinator_id=null,coordinator_agreed_at=null where id=tid;
 elsif p_action in ('release_member','expire_offer') then
  tid:=(p_payload->>'team_id')::uuid;uid:=(p_payload->>'user_id')::uuid;
  select * into t from public.website_project_teams where id=tid for update;
  select * into m from public.website_project_team_members where team_id=tid and user_id=uid for update;
  if t.status='completed' or m.status not in ('offered','confirmed') or m.user_id is null then raise exception 'Select a current offer or membership';end if;
  reason:=btrim(coalesce(p_payload->>'reason',''));if length(reason) not between 8 and 500 then raise exception 'Record why the placement is being released';end if;
  if p_action='expire_offer' and (m.status<>'offered' or m.offer_expires_at is null or m.offer_expires_at>now()) then raise exception 'Only an overdue unanswered offer can expire';end if;
  if t.status='active' then update public.website_project_teams set status='paused' where id=tid;end if;
  update public.website_project_team_members set status=case when m.status='offered' then 'declined' else 'left' end where team_id=tid and user_id=uid;
  if t.coordinator_id=uid or t.coordinator_nominee_id=uid then update public.website_project_teams set coordinator_id=null,coordinator_nominee_id=null,coordinator_agreed_at=null where id=tid;end if;
 elsif p_action='start' then
  tid:=(p_payload->>'team_id')::uuid;select * into t from public.website_project_teams where id=tid for update;
  if t.status not in ('forming','paused') then raise exception 'Only a forming or paused placement can start';end if;
  result:=private_website_lab.readiness(tid);
  if result->>'ready'<>'true' then raise exception 'Complete every readiness check before starting';end if;
  if t.status='paused' then update public.website_project_teams set status='forming' where id=tid;end if;
  perform private_website_lab.control('start',p_payload);
 elsif p_action='reopen_preparation' then
  tid:=(p_payload->>'team_id')::uuid;select * into t from public.website_project_teams where id=tid for update;
  reason:=btrim(coalesce(p_payload->>'reason',''));if t.status<>'paused' or length(reason) not between 8 and 500 then raise exception 'Select a paused placement and explain the return to preparation';end if;
  update public.website_project_teams set status='forming',accepting_members=true where id=tid;
 elsif p_action='placement_status' then
  tid:=(p_payload->>'team_id')::uuid;select * into t from public.website_project_teams where id=tid for update;
  a:=p_payload->>'status';reason:=btrim(coalesce(p_payload->>'reason',''));
  if a not in ('paused','completed') or a is null or t.status='completed' or length(reason) not between 8 and 500 then raise exception 'Choose pause or complete and record a reason';end if;
  if a='completed' and exists(select 1 from public.website_project_team_members where team_id=tid and status='offered') then raise exception 'Resolve unanswered offers before completing';end if;
  update public.website_project_teams set status=a,accepting_members=false where id=tid;
 elsif p_action='project_capacity' then
  cap:=(p_payload->>'maximum_members')::integer;
  if cap is null or cap not between 3 and 12 then raise exception 'Choose capacity between three and twelve';end if;
  update public.website_project_pilot_settings set member_capacity=cap where project_ref=p_payload->>'project_ref';
 elsif p_action in ('create','coordinator') then raise exception 'Use reviewed formation and coordinator nomination';
 else return private_website_lab.control(p_action,p_payload);
 end if;
 insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,tid,p_payload);
 return jsonb_build_object('ok',true,'team_id',tid);
end $$;
revoke all on function private_website_lab.admission(text,jsonb) from public,anon;
grant execute on function private_website_lab.admission(text,jsonb) to authenticated;
revoke execute on function private_website_lab.control(text,jsonb) from authenticated;

create or replace function public.website_lab(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if p_action='agree_two' then return private_website_lab.agree_two((p_payload->>'team_id')::uuid);end if;
 if p_action in ('chat_snapshot','discussion','discussion_edit','discussion_delete','discussion_pin','discussion_classify','chat_link') then return private_website_lab.chat(p_action,p_payload);end if;
 if p_action in ('workspace','prepare_workspace','task_status','task_history','add_item','assign_item') then return private_website_lab.workspace(p_action,p_payload);end if;
 return private_website_lab.admission(p_action,p_payload);
end $$;
commit;
