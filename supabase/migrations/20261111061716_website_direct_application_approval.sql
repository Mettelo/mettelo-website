-- Direct official application approval. No existing decisions or memberships are migrated.
alter table private_website_lab.interest_reviews drop constraint interest_reviews_status_check;
alter table private_website_lab.interest_reviews add constraint interest_reviews_status_check check(status in ('new','clarification','shortlisted','approved','declined','withdrawn'));
alter table private_website_lab.interest_reviews
 add column placement_route text check(placement_route in ('solo','team')),
 add column placement_state text check(placement_state in ('pending','waiting_team','placed','blocked')),
 add column placement_team_id uuid references public.website_project_teams(id),
 add column placement_role text,
 add column placement_error text,
 add column approved_at timestamptz;

-- Compatibility hook: only newly placed, explicitly approved OFFICIAL applicants skip an offer.
-- Market memberships and all historical offers keep their existing contract.
create function private_website_lab.confirm_approved_placement() returns trigger
language plpgsql security definer set search_path='' as $$
declare r private_website_lab.interest_reviews;i public.website_project_interests;t public.website_project_teams;
begin
 if new.admission_route<>'core' then return new;end if;
 select * into r from private_website_lab.interest_reviews where interest_id=new.interest_id;
 if r.status is distinct from 'approved' then return new;end if;
 if new.status='offered' and (tg_op='INSERT' or old.status in ('declined','left')) then
  if not private_website_lab.permitted(auth.uid(),'operations') then raise exception 'Administrator placement required' using errcode='42501';end if;
  select * into i from public.website_project_interests where id=new.interest_id;
  select * into t from public.website_project_teams where id=new.team_id;
  if r.placement_route is distinct from t.participation then raise exception 'Use the approved placement route';end if;
  if not private_website_lab.account_allowed(new.user_id) or i.answers->>'commitment_response'='no' then raise exception 'Member eligibility needs review';end if;
  if exists(select 1 from private_website_lab.placement_restrictions where user_id=new.user_id and project_ref=new.project_ref and cleared_at is null) then raise exception 'Placement restriction needs review';end if;
  if exists(select 1 from public.website_project_team_members m where m.interest_id=i.id and m.team_id<>new.team_id and m.status in ('offered','confirmed')) then raise exception 'This application already has a placement';end if;
  new.status:='confirmed';
  -- The submitted, terms-accepted application is the participation request. This is NOT a
  -- fabricated member response: role/commitment and external access remain separate checks.
  new.acknowledged_at:=i.submitted_at;
  new.offer_expires_at:=null;
 end if;
 if new.status='confirmed' then new.offer_expires_at:=null;end if;
 return new;
end $$;
revoke all on function private_website_lab.confirm_approved_placement() from public,anon,authenticated;
create trigger a0_confirm_approved_placement before insert or update on public.website_project_team_members
 for each row execute function private_website_lab.confirm_approved_placement();

create function private_website_lab.record_approved_placement() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.admission_route='core' and new.status='confirmed' then
  update private_website_lab.interest_reviews set placement_state='placed',placement_team_id=new.team_id,placement_error=null
   where interest_id=new.interest_id and status='approved' and (placement_state is distinct from 'placed' or placement_team_id is distinct from new.team_id);
 end if;
 return new;
end $$;
revoke all on function private_website_lab.record_approved_placement() from public,anon,authenticated;
create trigger b_record_approved_placement after insert or update on public.website_project_team_members
 for each row execute function private_website_lab.record_approved_placement();

create function private_website_lab.application_approval(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();i public.website_project_interests;r private_website_lab.interest_reviews;
 route text;role_name text;tid uuid;members uuid[];result jsonb;failure text;
begin
 if actor is null or not private_website_lab.account_allowed(actor) or not private_website_lab.permitted(actor,'operations') then raise exception 'Project administrator access required' using errcode='42501';end if;
 if p_action not in ('approve','retry') or p_action is null then raise exception 'Choose approve or retry';end if;
 select * into i from public.website_project_interests where id=(p_payload->>'interest_id')::uuid;
 if i.id is null then raise exception 'Application not found';end if;
 tid:=nullif(p_payload->>'team_id','')::uuid;
 -- Same sorted per-person locks as official placements and Market admissions, BEFORE row locks.
 select array_agg(distinct uid order by uid) into members from (
  select actor uid union select i.user_id union select m.user_id from public.website_project_team_members m where m.team_id=tid
 ) x;
 perform private_website_lab.participation_locks(members);
 perform 1 from public.website_project_interests where id=i.id for update;
 select * into r from private_website_lab.interest_reviews where interest_id=i.id for update;
 if r.status='approved' then
  if p_action='approve' or r.placement_state='placed' then
   return jsonb_build_object('status','approved','placement_state',r.placement_state,'team_id',r.placement_team_id,'placement_error',r.placement_error,'already_approved',true);
  end if;
  route:=r.placement_route;role_name:=r.placement_role;
  tid:=coalesce(tid,r.placement_team_id);
 elsif p_action='retry' then raise exception 'Only an approved application can retry placement';
 else
  if r.status in ('declined','withdrawn') then raise exception 'Reopen this closed application before making a new decision';end if;
  route:=case when i.participation='flexible' then nullif(p_payload->>'participation','') else i.participation end;
  if route not in ('solo','team') or route is null then raise exception 'Choose the intended Solo or Team route for this Flexible application';end if;
  role_name:=coalesce(nullif(p_payload->>'role',''),i.primary_role);
  if not exists(select 1 from public.website_project_briefs b where b.project_ref=i.project_ref and b.roles ? role_name) then raise exception 'Choose a responsibility from this project';end if;
  if coalesce(length(p_payload->>'reason'),0)>1500 then raise exception 'Administrator note is too long';end if;
  insert into private_website_lab.interest_reviews(interest_id,status,note,reviewer_id,placement_route,placement_role,placement_state,approved_at)
   values(i.id,'approved',coalesce(p_payload->>'reason',''),actor,route,role_name,'pending',now())
   on conflict(interest_id) do update set status='approved',note=excluded.note,reviewer_id=actor,updated_at=now(),placement_route=route,placement_role=role_name,placement_state='pending',approved_at=now();
  insert into private_website_lab.audit(actor_id,action,payload) values(actor,'approve_application',jsonb_build_object('interest_id',i.id,'route',route,'role',role_name,'prior_status',coalesce(r.status,'new'),'prior_note',r.note));
 end if;
 -- Approval is OUTSIDE this savepoint. Failed provisioning rolls back all partial Lab writes.
 begin
  select m.team_id into tid from public.website_project_team_members m where m.interest_id=i.id
   order by case when m.status in ('offered','confirmed') then 0 else 1 end,m.joined_at limit 1;
  if tid is not null then
   update private_website_lab.interest_reviews set placement_state='placed',placement_team_id=tid,placement_error=null where interest_id=i.id;
  else
   if not private_website_lab.account_allowed(i.user_id) then raise exception 'Member eligibility needs review';end if;
   if exists(select 1 from private_website_lab.placement_restrictions where user_id=i.user_id and project_ref=i.project_ref and cleared_at is null) then raise exception 'Placement restriction needs review';end if;
   if i.answers->>'commitment_response'='no' then raise exception 'Working commitment needs clarification';end if;
   perform private_website_lab.assert_participation_slot(i.user_id,null);
   tid:=nullif(p_payload->>'team_id','')::uuid;
   if route='solo' then
    result:=private_website_lab.operations('form_group',jsonb_build_object('project_ref',i.project_ref,'label',i.project_ref||'-S-'||replace(i.id::text,'-',''),'participation','solo','compatibility_reviewed','true','required_roles',jsonb_build_array(role_name),'members',jsonb_build_array(jsonb_build_object('interest_id',i.id,'role',role_name))));
    tid:=(result->>'team_id')::uuid;
    -- Ownership and starter workspace use existing services; commitment remains member-confirmed.
    perform private_website_lab.control('coordinator',jsonb_build_object('team_id',tid,'user_id',i.user_id));
    perform private_website_lab.operations('prepare_workspace',jsonb_build_object('team_id',tid));
   elsif tid is not null then
    if not exists(select 1 from public.website_project_teams where id=tid and project_ref=i.project_ref and participation='team' and status='forming' and accepting_members) then raise exception 'Choose a forming team for this project';end if;
    perform private_website_lab.operations('offer',jsonb_build_object('team_id',tid,'interest_id',i.id,'responsibilities',jsonb_build_array(role_name)));
   else
    update private_website_lab.interest_reviews set placement_state='waiting_team',placement_error=null where interest_id=i.id;
   end if;
   if tid is not null then update private_website_lab.interest_reviews set placement_state='placed',placement_team_id=tid,placement_error=null where interest_id=i.id;end if;
  end if;
 exception when others then
  get stacked diagnostics failure=message_text;
  update private_website_lab.interest_reviews set placement_state='blocked',placement_team_id=null,placement_error=left(failure,500) where interest_id=i.id;
 end;
 select * into r from private_website_lab.interest_reviews where interest_id=i.id;
 perform private_website_lab.notify_member(i.user_id,'approval:'||i.id,
  case when r.placement_state='waiting_team' then 'Application approved: awaiting team formation'
       when r.placement_state='blocked' then 'Application approved: Mettelo is reviewing your placement'
       else 'Application approved: review your Lab preparation' end,'/member/lab');
 insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,case when p_action='retry' then 'retry_approved_placement' else 'approved_placement_result' end,r.placement_team_id,jsonb_build_object('interest_id',i.id,'placement_state',r.placement_state,'placement_error',r.placement_error));
 return jsonb_build_object('status','approved','placement_state',r.placement_state,'team_id',r.placement_team_id,'placement_error',r.placement_error);
end $$;
revoke all on function private_website_lab.application_approval(text,jsonb) from public,anon;
grant usage on schema private_website_lab to authenticated;
grant execute on function private_website_lab.application_approval(text,jsonb) to authenticated;
create function public.website_project_approval(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select private_website_lab.application_approval(p_action,p_payload)$$;
revoke all on function public.website_project_approval(text,jsonb) from public,anon;
grant execute on function public.website_project_approval(text,jsonb) to authenticated;

-- Member-only projection: placement outcome, never internal notes or provisioning errors.
create or replace function private_website_lab.application_statuses() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified account required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'status',case
  when r.status='approved' and r.placement_state='waiting_team' then 'approved_waiting'
  when r.status='approved' and r.placement_state='blocked' then 'approved_blocked'
  else coalesce(r.status,'new') end)) from public.website_project_interests i left join private_website_lab.interest_reviews r on r.interest_id=i.id where i.user_id=actor),'[]');
end $$;

CREATE OR REPLACE FUNCTION private_website_lab.admission(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare actor uuid:=auth.uid(); admin boolean; t public.website_project_teams; m public.website_project_team_members; i public.website_project_interests;
 tid uuid; result jsonb; row jsonb; person jsonb; chosen jsonb; a text; reason text; ref text; nominee uuid; cap integer; n integer; uid uuid; expiry timestamptz;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 select private_website_lab.permitted(actor,'operations') into admin;
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
  return coalesce((select jsonb_agg(x||jsonb_build_object('offer_availability',i.answers->>'availability','offer_collaboration',i.answers->>'collaboration_availability','offer_time_zone',i.answers->>'time_zone','is_nominee',t.coordinator_nominee_id=actor,'coordinator_agreed',t.coordinator_agreed_at is not null,'offer_expires_at',m.offer_expires_at,'commitment_confirmed',m.commitment_confirmed_at is not null)) from jsonb_array_elements(result) x join public.website_project_teams t on t.id=(x->>'team_id')::uuid join public.website_project_team_members m on m.team_id=t.id and m.user_id=actor left join public.website_project_interests i on i.id=m.interest_id),'[]');
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
  if exists(select 1 from private_website_lab.interest_reviews where interest_id=i.id and status='approved') then raise exception 'This application is already approved. Manage or retry its placement instead of repeating the decision';end if;
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
  chosen:=(select jsonb_agg(x||jsonb_build_object('role',assigned[1],'roles',to_jsonb(assigned)) order by ordinal) from jsonb_array_elements(chosen) with ordinality entry(x,ordinal) cross join lateral (select private_website_lab.placement_responsibilities(ref,x->'roles',x->>'role',array(select jsonb_array_elements_text(coalesce(p_payload->'required_roles','[]'))),a='solo') as assigned) normalised);
  if cap is null or n<(case when a='solo' then 1 when p_payload->>'two_person_exception'='true' and length(btrim(coalesce(p_payload->>'reason',''))) between 8 and 500 then 2 else 3 end) or n>(case when a='solo' then 1 else cap end) then raise exception 'Choose one solo owner or a team within project capacity';end if;
  if (select count(distinct x->>'interest_id') from jsonb_array_elements(chosen) x)<>n then raise exception 'Each applicant must be selected once';end if;
  nominee:=nullif(p_payload->>'nominee_id','')::uuid;
  expiry:=now()+make_interval(days=>coalesce(nullif(p_payload->>'offer_days','')::integer,7));
  if expiry<now()+interval '1 day' or expiry>now()+interval '30 days' then raise exception 'Offer deadline must be 1 to 30 days';end if;
  for person in select * from jsonb_array_elements(chosen) loop
   select * into i from public.website_project_interests where id=(person->>'interest_id')::uuid and project_ref=ref for update;
   if i.id is null or not exists(select 1 from private_website_lab.interest_reviews where interest_id=i.id and status in ('shortlisted','approved')) then raise exception 'Every applicant must be shortlisted';end if;
   if exists(select 1 from private_website_lab.interest_reviews r where r.interest_id=i.id and r.status='approved' and r.placement_route<>a) then raise exception 'Use the approved placement route';end if;
   if i.participation not in (a,'flexible') or i.answers->>'commitment_response'='no' then raise exception 'Review the applicant working preference and commitment';end if;
   if exists(select 1 from public.website_project_team_members where user_id=i.user_id and project_ref=ref and status in ('offered','confirmed')) then raise exception 'An applicant already has an offer or place; refresh the proposals';end if;
   if not exists(select 1 from public.website_project_briefs where project_ref=ref and roles ? (person->>'role')) then raise exception 'Choose a valid project role for each applicant';end if;
   if i.user_id=nominee and coalesce(i.answers->>'coordination_preference',case when i.answers->>'leadership_interest'='true' then 'interested_with_support' else '' end) not in ('comfortable','interested_with_support') then raise exception 'Nominate someone who volunteered to coordinate';end if;
  end loop;
  if a='team' and (nominee is null or not exists(select 1 from public.website_project_interests where id in (select (x->>'interest_id')::uuid from jsonb_array_elements(chosen) x) and user_id=nominee)) then raise exception 'Nominate a selected coordinator candidate';end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(p_payload->'required_roles','[]')) as required(value) where not exists(select 1 from jsonb_array_elements(chosen) x where (x->'roles') ? required.value)) then raise exception 'Cover the essential responsibilities';end if;
  result:=private_website_lab.control('create',p_payload);tid:=(result->>'team_id')::uuid;
  update public.website_project_teams set maximum_members=cap,coordinator_nominee_id=case when a='team' then nominee else null end where id=tid;
  if a='team' and n=2 then update public.website_project_teams set two_person_reason=btrim(p_payload->>'reason'),two_person_approved_by=actor,two_person_approved_at=now() where id=tid;end if;
  for person in select * from jsonb_array_elements(chosen) loop
   perform private_website_lab.control('offer',jsonb_build_object('team_id',tid,'interest_id',person->>'interest_id','role',person->>'role','responsibilities',person->'roles'));
   update public.website_project_team_members set offer_expires_at=expiry where team_id=tid and interest_id=(person->>'interest_id')::uuid;
  end loop;
 elsif p_action='offer' then
  select * into i from public.website_project_interests where id=(p_payload->>'interest_id')::uuid;
  if i.id is null or not exists(select 1 from private_website_lab.interest_reviews where interest_id=i.id and status in ('shortlisted','approved')) or i.answers->>'commitment_response'='no' then raise exception 'Shortlist an available applicant first';end if;
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
  if t.participation<>'team' or not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=uid and admission_route='core' and status='confirmed') then raise exception 'Nominate an accepted team member';end if;
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
end $function$
;
CREATE OR REPLACE FUNCTION private_website_lab.operations(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid();tid uuid:=nullif(p_payload->>'team_id','')::uuid;users uuid[];
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not private_website_lab.account_allowed(actor) then raise exception 'Verified account access required' using errcode='42501';end if;
 if p_action='participation_usage' then return private_website_lab.participation_usage(actor);end if;
 if p_action in ('review_interest','form_group','offer','respond','confirm_commitment','agree_coordinator','agree_two','verify_access','allow_two','prepare_workspace','add_item','assign_item','expire_offer','admit_member','release_member','external_access_review','start','placement_status','reopen_preparation') then
  if p_action='assign_item' and tid is null then select team_id into tid from private_website_lab.items where id=(p_payload->>'item_id')::uuid;end if;
  select array_agg(distinct uid order by uid) into users from (
   select actor uid
   union select user_id from public.website_project_team_members where team_id=tid
   union select user_id from public.website_project_interests where id=nullif(p_payload->>'interest_id','')::uuid
   union select i.user_id from jsonb_array_elements(case when p_action='form_group' then coalesce(p_payload->'members','[]') else '[]'::jsonb end) x join public.website_project_interests i on i.id=(x->>'interest_id')::uuid
  ) affected;
  perform private_website_lab.participation_locks(users);
 end if;
 return private_website_lab.operations_before_participation_policy(p_action,p_payload);
end $function$
;
CREATE OR REPLACE FUNCTION private_website_lab.operations_before_ready_activation(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare actor uuid:=auth.uid(); admin boolean; member boolean; lead boolean; tid uuid; uid uuid; iid uuid; mid uuid; cid uuid; t public.website_project_teams;m public.website_project_team_members;i public.website_project_interests;c private_website_lab.support_cases;e private_website_lab.meetings;result jsonb;reason text;kind text;target text;filled integer;allow_continue boolean;row jsonb;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 select private_website_lab.permitted(actor,'operations') into admin;
 tid:=nullif(p_payload->>'team_id','')::uuid;
 if tid is not null then select * into t from public.website_project_teams where id=tid for update;end if;
 select exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status='confirmed' and admitted_at is not null) into member;
 lead:=coalesce(admin or (member and t.coordinator_id=actor),false);
 if p_action='formation_list' then
  result:=private_website_lab.admission(p_action,p_payload);
  result:=jsonb_set(result,'{interests}',coalesce((select jsonb_agg(x||jsonb_build_object('restricted',exists(select 1 from private_website_lab.placement_restrictions r where r.user_id=(x->>'user_id')::uuid and r.project_ref=x->>'project_ref' and r.cleared_at is null))) from jsonb_array_elements(result->'interests') x),'[]'));
  result:=jsonb_set(result,'{teams}',coalesce((select jsonb_agg(x||jsonb_build_object('members',coalesce((select jsonb_agg(y||jsonb_build_object('assigned_open_items',(select count(*) from private_website_lab.items a where a.team_id=m.team_id and a.owner_id=m.user_id and a.kind in ('task','milestone') and a.status<>'done'),'admitted',m.admitted_at is not null,'onboarding_checked',m.onboarding_checked_at is not null,'external_access_revoked',m.external_access_revoked_at is not null)) from jsonb_array_elements(x->'members') y join public.website_project_team_members m on m.team_id=(x->>'id')::uuid and m.user_id=(y->>'user_id')::uuid),'[]'))) from jsonb_array_elements(result->'teams') x),'[]'));
  return result||'{"operations_version":1,"responsibilities_version":1}'::jsonb;
 elsif p_action='mine' then
  result:=private_website_lab.admission(p_action,p_payload);
  return coalesce((select jsonb_agg(x||jsonb_build_object('can_enter',m.admitted_at is not null,'onboarding_pending',m.status='confirmed' and m.admitted_at is null and t.status='active')) from jsonb_array_elements(result) x join public.website_project_team_members m on m.team_id=(x->>'team_id')::uuid and m.user_id=actor join public.website_project_teams t on t.id=m.team_id),'[]');
 elsif p_action in ('support_list','support_case','support_create','support_reply','support_update') then
  if not private_website_lab.account_allowed(actor) then raise exception 'Account access required' using errcode='42501';end if; if p_action='support_list' then
   return jsonb_build_object('admin',admin,'cases',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'team_id',x.team_id,'team_label',coalesce(tt.label,'Member support'),'project_ref',coalesce(tt.project_ref,'General enquiry'),'category',x.category,'subject',x.subject,'status',x.status,'reporter_name',p.full_name,'created_at',x.created_at,'updated_at',x.updated_at) order by x.updated_at desc) from private_website_lab.support_cases x left join public.website_project_teams tt on tt.id=x.team_id left join public.profiles p on p.id=x.reporter_id where ((admin and coalesce(p_payload->>'personal','false')<>'true') or x.reporter_id=actor) and (tid is null or x.team_id=tid)),'[]'));
  elsif p_action='support_create' then
   if tid is not null and (t.id is null or not (admin or exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status in ('offered','confirmed')))) then raise exception 'A current placement is required to open a team enquiry' using errcode='42501';end if;
   if (tid is null and coalesce(p_payload->>'category','') not in ('account','application','platform','other')) or (tid is not null and coalesce(p_payload->>'category','') not in ('scope','access','add_member','remove_member','coordinator','inactive_member','conduct','delivery','meeting','other')) then raise exception 'Choose a topic matching your enquiry';end if;
   if coalesce(length(btrim(p_payload->>'subject')),0) not between 5 and 180 or coalesce(length(btrim(p_payload->>'description')),0) not between 20 and 5000 then raise exception 'Add a title of 5–180 characters and a message of 20–5000 characters';end if;
   -- Serialise retries/rate checks per reporter, without trusting a supplied reporter ID.
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('member-support:'||actor::text,0));
   if nullif(p_payload->>'client_nonce','') is not null then
    select * into c from private_website_lab.support_cases where reporter_id=actor and client_nonce=(p_payload->>'client_nonce')::uuid;
    if c.id is not null then
     if c.team_id is distinct from tid or c.category is distinct from p_payload->>'category' or c.subject is distinct from btrim(p_payload->>'subject') or c.description is distinct from btrim(p_payload->>'description') then raise exception 'This submission was already used. Start a new enquiry';end if;
     return jsonb_build_object('ok',true,'case_id',c.id,'already_saved',true);
    end if;
   end if;
   if (select count(*) from private_website_lab.support_cases where reporter_id=actor and created_at>now()-interval '1 hour')>=5 then raise exception 'You have sent several enquiries. Please follow up in an existing conversation or try again later';end if;
   insert into private_website_lab.support_cases(team_id,reporter_id,category,subject,description,client_nonce) values(tid,actor,p_payload->>'category',btrim(p_payload->>'subject'),btrim(p_payload->>'description'),nullif(p_payload->>'client_nonce','')::uuid) returning id into cid;
  else
   cid:=(p_payload->>'case_id')::uuid;select * into c from private_website_lab.support_cases where id=cid for update;
   if c.id is null or not (admin or c.reporter_id=actor) then raise exception 'Enquiry access required' using errcode='42501';end if;
   if p_action='support_case' then return jsonb_build_object('admin',admin,'case',to_jsonb(c),'replies',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'body',r.body,'internal',r.internal,'created_at',r.created_at,'author',coalesce(p.full_name,'Mettelo support')) order by r.created_at) from private_website_lab.support_replies r left join public.profiles p on p.id=r.author_id where case_id=cid and (admin or not r.internal)),'[]'));end if;
   if p_action='support_update' then
    if not admin then raise exception 'Support administrator required' using errcode='42501';end if;
    update private_website_lab.support_cases set status=p_payload->>'status',updated_at=now() where id=cid;
   else
    if c.status='closed' then raise exception 'This enquiry is closed; ask support to reopen it';end if;
    if p_payload->>'internal'='true' and not admin then raise exception 'Internal notes require support administrator access' using errcode='42501';end if;
    insert into private_website_lab.support_replies(case_id,author_id,body,internal) values(cid,actor,btrim(p_payload->>'body'),admin and coalesce(p_payload->>'internal','false')='true');
    update private_website_lab.support_cases set updated_at=now(),status=case when c.reporter_id=actor and c.status='waiting_for_member' and coalesce(p_payload->>'internal','false')<>'true' then 'in_review' else status end where id=cid;
   end if;
  end if;
  insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,coalesce(tid,c.team_id),jsonb_build_object('case_id',cid));
  return jsonb_build_object('ok',true,'case_id',cid);
 elsif p_action in ('meetings','meeting_save','meeting_cancel') then
  if t.id is null or not (admin or member) or (not admin and t.status not in ('active','completed')) then raise exception 'Lab membership required' using errcode='42501';end if;
  if p_action='meetings' then return jsonb_build_object('can_schedule',(admin or member) and t.status='active','meetings',coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('can_manage',coalesce((admin or x.organiser_id=actor or t.coordinator_id=actor) and t.status='active',false)) order by x.starts_at) from private_website_lab.meetings x where team_id=tid),'[]'));end if;
  if not (admin or member) or t.status<>'active' then raise exception 'An active team member is required to schedule a meeting' using errcode='42501';end if;
  mid:=nullif(p_payload->>'meeting_id','')::uuid;
  if p_action='meeting_save' and mid is null and nullif(p_payload->>'client_nonce','') is not null then
   select * into e from private_website_lab.meetings where organiser_id=actor and client_nonce=(p_payload->>'client_nonce')::uuid;
   if e.id is not null then
    if e.team_id<>tid or e.topic<>btrim(p_payload->>'topic') or e.starts_at<>(p_payload->>'starts_at')::timestamptz or e.ends_at<>(p_payload->>'ends_at')::timestamptz or e.join_url<>p_payload->>'join_url' or e.agenda<>coalesce(p_payload->>'agenda','') then raise exception 'This save token already belongs to another meeting change; reload the form';end if;
    return jsonb_build_object('ok',true,'meeting_id',e.id,'already_saved',true);
   end if;
  end if;
  if mid is not null then select * into e from private_website_lab.meetings where id=mid and team_id=tid for update;if e.id is null then raise exception 'Meeting not found';end if; if not lead and e.organiser_id<>actor then raise exception 'Only the organiser or coordinator can change this meeting' using errcode='42501';end if;
   if (p_payload->>'expected_revision')::integer is distinct from e.revision then raise exception 'Meeting changed; reload before editing';end if;
  end if;
  if p_action='meeting_cancel' then
   if e.id is null or e.status<>'scheduled' then raise exception 'Select a scheduled meeting';end if;
   update private_website_lab.meetings set status='cancelled',revision=revision+1,updated_at=now() where id=mid;
  else
   if (p_payload->>'starts_at')::timestamptz<=now() then raise exception 'Choose a future meeting time';end if;
   if not exists(select 1 from pg_timezone_names where name=p_payload->>'time_zone') then raise exception 'Choose a recognised time zone';end if;
   if e.id is not null and e.status='cancelled' then raise exception 'Create a new meeting instead of editing a cancellation';end if;
   if mid is null then
    insert into private_website_lab.meetings(team_id,organiser_id,client_nonce,topic,agenda,starts_at,ends_at,time_zone,join_url) values(tid,actor,nullif(p_payload->>'client_nonce','')::uuid,btrim(p_payload->>'topic'),coalesce(p_payload->>'agenda',''),(p_payload->>'starts_at')::timestamptz,(p_payload->>'ends_at')::timestamptz,p_payload->>'time_zone',p_payload->>'join_url') returning id into mid;
   else update private_website_lab.meetings set topic=btrim(p_payload->>'topic'),agenda=coalesce(p_payload->>'agenda',''),starts_at=(p_payload->>'starts_at')::timestamptz,ends_at=(p_payload->>'ends_at')::timestamptz,time_zone=p_payload->>'time_zone',join_url=p_payload->>'join_url',revision=revision+1,updated_at=now() where id=mid;end if;
  end if;
  perform private_website_lab.queue_meeting(mid);
  insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,tid,jsonb_build_object('meeting_id',mid));return jsonb_build_object('ok',true,'meeting_id',mid);
 elsif p_action='outbox_list' then
  if not admin then raise exception 'Support administrator required' using errcode='42501';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'topic',e.topic,'team',tt.label,'recipient',p.full_name,'kind',o.kind,'state',o.state,'attempts',o.attempts,'last_error',o.last_error,'created_at',o.created_at) order by o.created_at desc) from private_website_lab.mail_outbox o join private_website_lab.meetings e on e.id=o.meeting_id join public.website_project_teams tt on tt.id=e.team_id left join public.profiles p on p.id=o.user_id),'[]');
 
 elsif p_action='outbox_reconcile' then
  if not admin then raise exception 'Support administrator required' using errcode='42501';end if;
  reason:=btrim(coalesce(p_payload->>'reason',''));target:=p_payload->>'status';
  if p_payload->>'provider_reviewed' is distinct from 'true' or length(reason) not between 8 and 500 or target not in ('sent','failed') or target is null then raise exception 'Review provider logs and record a confirmed delivery outcome';end if;
  if target='sent' and coalesce(length(p_payload->>'provider_id'),0)<5 then raise exception 'Record the provider delivery ID';end if;
  update private_website_lab.mail_outbox set state=target,provider_id=nullif(p_payload->>'provider_id',''),last_error=reason,next_attempt_at=now(),lease_until=null where id=(p_payload->>'job_id')::uuid and state='unknown';
  if not found then raise exception 'Choose an uncertain delivery for reconciliation';end if;
  insert into private_website_lab.audit(actor_id,action,payload) values(actor,p_action,jsonb_build_object('job_id',p_payload->>'job_id','outcome',target,'reason',reason));
  return '{"ok":true}';
 elsif p_action='outbox_retry' then
 
  if not admin then raise exception 'Support administrator required' using errcode='42501';end if;
  update private_website_lab.mail_outbox set state='pending',attempts=0,next_attempt_at=now(),last_error=null where id=(p_payload->>'job_id')::uuid and state='failed';
  if not found then raise exception 'Only a confirmed failed delivery can retry; unknown deliveries require provider reconciliation';end if;
  return '{"ok":true}';
 end if;
 if not admin and p_action in ('offer','release_member','clear_restriction','admit_member','form_group','external_access_review') then raise exception 'Project administrator required' using errcode='42501';end if;
 if p_action='offer' then
  p_payload:=p_payload||jsonb_build_object('responsibilities',to_jsonb(private_website_lab.placement_responsibilities(t.project_ref,p_payload->'responsibilities',p_payload->>'role',t.required_roles,t.participation='solo')));
  p_payload:=p_payload||jsonb_build_object('role',p_payload->'responsibilities'->>0);
  select * into i from public.website_project_interests where id=(p_payload->>'interest_id')::uuid;
  if t.id is null or t.status not in ('forming','active','paused') or i.project_ref is distinct from t.project_ref or not exists(select 1 from private_website_lab.interest_reviews where interest_id=i.id and status in ('shortlisted','approved')) or i.answers->>'commitment_response'='no' or i.participation not in (t.participation,'flexible') then raise exception 'Choose a shortlisted applicant matching this placement';end if;
  if exists(select 1 from private_website_lab.interest_reviews r where r.interest_id=i.id and r.status='approved' and r.placement_route<>t.participation) then raise exception 'Use the approved placement route';end if;
  if exists(select 1 from private_website_lab.placement_restrictions where user_id=i.user_id and project_ref=t.project_ref and cleared_at is null) then raise exception 'This applicant needs restriction review before a new offer';end if;
  if t.status='paused' then update public.website_project_teams set status='forming',accepting_members=true where id=tid;end if;
  insert into public.website_project_team_members(team_id,interest_id,user_id,project_ref,role,status,offer_expires_at,responsibilities) values(tid,i.id,i.user_id,t.project_ref,p_payload->>'role','offered',now()+interval '7 days',array(select jsonb_array_elements_text(p_payload->'responsibilities'))) on conflict(team_id,user_id) do update set role=excluded.role,responsibilities=excluded.responsibilities,status='offered',offer_expires_at=excluded.offer_expires_at,acknowledged_at=null,access_verified_at=null,access_verified_by=null,commitment_confirmed_at=null,two_person_agreed_at=null,admitted_at=null,onboarding_checked_at=null,external_access_revoked_at=null where website_project_team_members.status in ('declined','left');
  if not found then raise exception 'This member already has a current placement';end if;
 elsif p_action='admit_member' then
  uid:=(p_payload->>'user_id')::uuid;select * into m from public.website_project_team_members where team_id=tid and user_id=uid for update;
  if t.id is null or m.user_id is null or t.status<>'active' or m.status<>'confirmed' or m.access_verified_at is null or m.commitment_confirmed_at is null or p_payload->>'onboarding_confirmed' is distinct from 'true' then raise exception 'Accepted place, commitment, repository check and onboarding are required';end if;
  if m.admitted_at is not null then return '{"ok":true,"already_admitted":true}';end if;
  update public.website_project_team_members set admitted_at=now(),onboarding_checked_at=now() where team_id=tid and user_id=uid;
  for mid in select id from private_website_lab.meetings where team_id=tid and status='scheduled' and starts_at>now() loop perform private_website_lab.queue_meeting(mid,uid);end loop;
 elsif p_action='release_member' then
  uid:=(p_payload->>'user_id')::uuid;reason:=btrim(coalesce(p_payload->>'reason',''));kind:=p_payload->>'release_reason';
  if kind not in ('withdrawal','inactive','role_change','restructure','conduct','other') or kind is null or length(reason) not between 8 and 500 then raise exception 'Choose a removal reason and explanation';end if;
  select * into m from public.website_project_team_members where team_id=tid and user_id=uid for update;
  if t.status='completed' or m.user_id is null or m.status not in ('offered','confirmed') then raise exception 'Choose a current placement';end if;
  -- Release first through the existing audited authority, which conservatively pauses an active team.
  if m.status='offered' then update public.website_project_team_members set status='declined' where team_id=tid and user_id=uid;
  else result:=private_website_lab.admission('release_member',p_payload);end if;
  update public.website_project_team_members set admitted_at=null,onboarding_checked_at=null where team_id=tid and user_id=uid;
  update private_website_lab.mail_outbox set state='cancelled' where user_id=uid and state in ('pending','failed') and meeting_id in (select id from private_website_lab.meetings where team_id=tid);
  if kind in ('conduct','withdrawal') then insert into private_website_lab.placement_restrictions(user_id,project_ref,reason) values(uid,t.project_ref,reason) on conflict(user_id,project_ref) do update set reason=excluded.reason,cleared_at=null,created_at=now();end if;
  select count(*) into filled from public.website_project_team_members where team_id=tid and status='confirmed' and admitted_at is not null;
  if m.admitted_at is not null and filled<=2 then
   update public.website_project_teams set two_person_reason=null,two_person_approved_at=null,two_person_approved_by=null where id=tid;
   update public.website_project_team_members set two_person_agreed_at=null where team_id=tid and status='confirmed';
  end if;
  -- Keep delivery active only after an explicit administrator review and with no orphaned open work.
  allow_continue:=t.status='active' and p_payload->>'keep_active'='true' and (filled>=3 or (t.participation='solo' and filled=1)) and t.coordinator_id is distinct from uid and not exists(select 1 from private_website_lab.items where team_id=tid and owner_id=uid and kind in ('task','milestone') and status<>'done');
  if allow_continue then
   result:=private_website_lab.readiness(tid);
   if result->>'ready'='true' then update public.website_project_teams set status='active' where id=tid;end if;
  end if;
 elsif p_action='external_access_review' then
  uid:=(p_payload->>'user_id')::uuid;
  if p_payload->>'external_access_confirmed' is distinct from 'true' then raise exception 'Confirm external access has actually been revoked';end if;
  update public.website_project_team_members set external_access_revoked_at=now() where team_id=tid and user_id=uid and status in ('left','declined');
  if not found then raise exception 'Choose a released placement';end if;
 elsif p_action='clear_restriction' then
  reason:=btrim(coalesce(p_payload->>'reason',''));if length(reason) not between 8 and 500 then raise exception 'Record the clearance decision';end if;
  update private_website_lab.placement_restrictions set cleared_at=now() where user_id=(p_payload->>'user_id')::uuid and project_ref=p_payload->>'project_ref';
 elsif p_action='start' then
  result:=private_website_lab.admission('start',p_payload);
  update public.website_project_team_members set admitted_at=coalesce(admitted_at,now()),onboarding_checked_at=coalesce(onboarding_checked_at,now()) where team_id=tid and status='confirmed';
 elsif p_action='form_group' then
  if exists(select 1 from jsonb_array_elements(p_payload->'members') x join public.website_project_interests i on i.id=(x->>'interest_id')::uuid join private_website_lab.placement_restrictions r on r.user_id=i.user_id and r.project_ref=i.project_ref and r.cleared_at is null) then raise exception 'Review the placement restriction before forming';end if;
  return private_website_lab.admission(p_action,p_payload);
 else
  if p_action in ('add_item','assign_item') and nullif(p_payload->>'owner_id','') is not null then
   if p_action='assign_item' then select team_id into tid from private_website_lab.items where id=(p_payload->>'item_id')::uuid;select * into t from public.website_project_teams where id=tid;end if;
   if t.status='active' and not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=(p_payload->>'owner_id')::uuid and status='confirmed' and admitted_at is not null) then raise exception 'Assign active work only to an admitted member';end if;
  end if;
  if p_action='agree_two' then return private_website_lab.agree_two(tid);end if;
  if p_action in ('chat_snapshot','discussion','discussion_edit','discussion_delete','discussion_pin','discussion_classify','chat_link') then return private_website_lab.chat(p_action,p_payload);end if;
  if p_action in ('workspace','prepare_workspace','task_status','task_history','add_item','assign_item') then return private_website_lab.workspace(p_action,p_payload);end if;
  return private_website_lab.admission(p_action,p_payload);
 end if;
 insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,tid,p_payload);
 return jsonb_build_object('ok',true,'team_id',tid);
end $function$
;
CREATE OR REPLACE FUNCTION private_website_lab.project_admin_directory(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
declare actor uuid:=auth.uid();project_filter text:=coalesce(nullif(p_payload->>'project',''),'all');
 section_filter text:=coalesce(nullif(p_payload->>'section',''),'attention');
 status_filter text:=coalesce(nullif(p_payload->>'status',''),'all');
 arrangement_filter text:=coalesce(nullif(p_payload->>'arrangement',''),'all');
 search_text text:=lower(btrim(coalesce(p_payload->>'q','')));
 review_filter text:=coalesce(nullif(p_payload->>'review',''),'all');
 page_number integer:=1;page_size constant integer:=25;total bigint;rows jsonb;meta jsonb;record_json jsonb;tid uuid;iid uuid;
begin
 if actor is null or not private_website_lab.account_allowed(actor) or not private_website_lab.permitted(actor,'operations') then raise exception 'Project administrator access required' using errcode='42501';end if;
 if length(search_text)>150 or length(project_filter)>80 or coalesce(p_payload->>'page','1')!~'^[0-9]{1,6}$' then raise exception 'Invalid directory filters';end if;
 page_number:=greatest(1,coalesce((p_payload->>'page')::integer,1));
 if section_filter not in ('attention','teams','applications') or status_filter not in ('all','forming','active','paused','completed') or arrangement_filter not in ('all','solo','team','flexible') or review_filter not in ('all','new','clarification','shortlisted','approved','declined','withdrawn') then raise exception 'Choose supported directory filters';end if;
 if p_action='team' then
  tid:=(p_payload->>'team_id')::uuid;
  select to_jsonb(t)||jsonb_build_object('readiness',private_website_lab.readiness(t.id),'members',coalesce((select jsonb_agg(jsonb_build_object(
   'user_id',m.user_id,'name',coalesce(p.full_name,'Member'),'role',array_to_string(m.responsibilities,' · '),'roles',to_jsonb(m.responsibilities),'status',m.status,
   'accepted',m.acknowledged_at is not null,'access_verified',m.access_verified_at is not null,'two_person_agreed',m.two_person_agreed_at is not null,
   'offer_expires_at',m.offer_expires_at,'commitment_confirmed',m.commitment_confirmed_at is not null,'admitted',m.admitted_at is not null,'onboarding_checked',m.onboarding_checked_at is not null,
   'external_access_revoked',m.external_access_revoked_at is not null,'assigned_open_items',(select count(*) from private_website_lab.items x where x.team_id=t.id and x.owner_id=m.user_id and x.kind in ('task','milestone') and x.status<>'done')) order by m.joined_at,m.user_id)
   from public.website_project_team_members m left join public.profiles p on p.id=m.user_id where m.team_id=t.id),'[]')) into record_json from public.website_project_teams t where t.id=tid;
  if record_json is null then raise exception 'Placement not found';end if;
  return jsonb_build_object('team',record_json);
 elsif p_action='application' then
  iid:=(p_payload->>'interest_id')::uuid;
  select to_jsonb(a)||jsonb_build_object('role',a.primary_role,'profile',jsonb_build_object('headline',a.headline,'experience_level',a.experience_level,'skills',a.skills,'weekly_availability',a.weekly_availability)) into record_json from private_website_lab.admin_application_directory a where a.id=iid;
  if record_json is null then raise exception 'Application not found';end if;
  select record_json||jsonb_build_object('placement_route',r.placement_route,'placement_state',r.placement_state,'placement_team_id',r.placement_team_id,'placement_error',r.placement_error,'placement_role',r.placement_role) into record_json from private_website_lab.interest_reviews r where r.interest_id=iid;
  if record_json is null then select to_jsonb(a)||jsonb_build_object('role',a.primary_role,'profile',jsonb_build_object('headline',a.headline,'experience_level',a.experience_level,'skills',a.skills,'weekly_availability',a.weekly_availability)) into record_json from private_website_lab.admin_application_directory a where a.id=iid;end if;
  return jsonb_build_object('interest',record_json,'forming_teams',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'label',t.label) order by t.label) from public.website_project_teams t where t.project_ref=record_json->>'project_ref' and t.participation='team' and t.status='forming' and t.accepting_members),'[]'));
 elsif p_action in ('list','candidates') then
  if p_action='candidates' then
   if project_filter='all' or arrangement_filter not in ('solo','team') then raise exception 'Choose one project and working arrangement';end if;
   select count(*) into total from private_website_lab.admin_application_directory a where a.project_ref=project_filter and a.review_status in ('shortlisted','approved') and (a.review_status<>'approved' or exists(select 1 from private_website_lab.interest_reviews r where r.interest_id=a.id and r.placement_route=arrangement_filter and r.placement_state='waiting_team')) and not a.allocated and not a.restricted and a.participation in (arrangement_filter,'flexible') and coalesce(a.answers->>'commitment_response','')<>'no' and (search_text='' or strpos(lower(a.name||' '||coalesce(a.primary_role,'')),search_text)>0);
   page_number:=least(page_number,greatest(1,ceil(total/25.0)::integer));
   select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('role',a.primary_role,'profile',jsonb_build_object('headline',a.headline,'experience_level',a.experience_level,'skills',a.skills,'weekly_availability',a.weekly_availability)) order by a.submitted_at,a.id),'[]') into rows from
    (select * from private_website_lab.admin_application_directory a where a.project_ref=project_filter and a.review_status in ('shortlisted','approved') and (a.review_status<>'approved' or exists(select 1 from private_website_lab.interest_reviews r where r.interest_id=a.id and r.placement_route=arrangement_filter and r.placement_state='waiting_team')) and not a.allocated and not a.restricted and a.participation in (arrangement_filter,'flexible') and coalesce(a.answers->>'commitment_response','')<>'no' and (search_text='' or strpos(lower(a.name||' '||coalesce(a.primary_role,'')),search_text)>0) order by a.submitted_at,a.id limit page_size offset (page_number-1)*page_size) a;
   return jsonb_build_object('rows',rows,'total',total,'page',page_number,'page_size',page_size);
  end if;
  select jsonb_build_object('projects',(select coalesce(jsonb_agg(jsonb_build_object('ref',b.project_ref,'title',b.title,'roles',b.roles,'member_capacity',s.member_capacity) order by b.project_ref),'[]') from public.website_project_briefs b left join public.website_project_pilot_settings s on s.project_ref=b.project_ref),
   'metrics',jsonb_build_object(
    'applications',(select count(*) from private_website_lab.admin_application_directory a where (project_filter='all' or a.project_ref=project_filter) and a.review_status='new'),
    'attention',(select count(*) from private_website_lab.admin_team_directory t where (project_filter='all' or t.project_ref=project_filter) and cardinality(t.actions)>0),
    'active',(select count(*) from public.website_project_teams t where (project_filter='all' or t.project_ref=project_filter) and t.status='active'),
    'enquiries',(select count(*) from private_website_lab.support_cases c left join public.website_project_teams t on t.id=c.team_id where c.team_id is not null and (project_filter='all' or t.project_ref=project_filter) and c.status not in ('resolved','closed')))) into meta;
  if section_filter='applications' then
   select count(*) into total from private_website_lab.admin_application_directory a where (project_filter='all' or a.project_ref=project_filter) and (review_filter='all' or a.review_status=review_filter) and (arrangement_filter='all' or a.participation=arrangement_filter) and (search_text='' or strpos(lower(a.name||' '||a.project_ref||' '||coalesce(a.primary_role,'')),search_text)>0);
   page_number:=least(page_number,greatest(1,ceil(total/25.0)::integer));
   select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'project_ref',a.project_ref,'role',a.primary_role,'participation',a.participation,'review_status',a.review_status,'allocated',a.allocated,'restricted',a.restricted,'submitted_at',a.submitted_at) order by a.submitted_at,a.id),'[]') into rows from
    (select * from private_website_lab.admin_application_directory a where (project_filter='all' or a.project_ref=project_filter) and (review_filter='all' or a.review_status=review_filter) and (arrangement_filter='all' or a.participation=arrangement_filter) and (search_text='' or strpos(lower(a.name||' '||a.project_ref||' '||coalesce(a.primary_role,'')),search_text)>0) order by a.submitted_at,a.id limit page_size offset (page_number-1)*page_size) a;
  else
   select count(*) into total from private_website_lab.admin_team_directory t where (project_filter='all' or t.project_ref=project_filter) and (status_filter='all' or t.status=status_filter) and (section_filter<>'teams' or status_filter<>'all' or t.status<>'completed') and (section_filter<>'attention' or cardinality(t.actions)>0) and (arrangement_filter='all' or t.participation=arrangement_filter) and (search_text='' or strpos(lower(t.label||' '||t.project_ref||' '||t.project_title||' '||t.coordinator_name),search_text)>0 or exists(select 1 from public.website_project_team_members m join public.profiles p on p.id=m.user_id where m.team_id=t.id and m.status in ('offered','confirmed') and strpos(lower(coalesce(p.full_name,'')),search_text)>0));
   page_number:=least(page_number,greatest(1,ceil(total/25.0)::integer));
   select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'label',t.label,'project_ref',t.project_ref,'project_title',t.project_title,'participation',t.participation,'coordinator_name',t.coordinator_name,'confirmed',t.confirmed,'maximum_members',t.maximum_members,'status',t.status,'actions',t.actions,'created_at',t.created_at,'open_cases',t.open_cases) order by t.priority,t.created_at,t.id),'[]') into rows from
    (select * from private_website_lab.admin_team_directory t where (project_filter='all' or t.project_ref=project_filter) and (status_filter='all' or t.status=status_filter) and (section_filter<>'teams' or status_filter<>'all' or t.status<>'completed') and (section_filter<>'attention' or cardinality(t.actions)>0) and (arrangement_filter='all' or t.participation=arrangement_filter) and (search_text='' or strpos(lower(t.label||' '||t.project_ref||' '||t.project_title||' '||t.coordinator_name),search_text)>0 or exists(select 1 from public.website_project_team_members m join public.profiles p on p.id=m.user_id where m.team_id=t.id and m.status in ('offered','confirmed') and strpos(lower(coalesce(p.full_name,'')),search_text)>0)) order by t.priority,t.created_at,t.id limit page_size offset (page_number-1)*page_size) t;
  end if;
  return meta||jsonb_build_object('rows',rows,'total',total,'page',page_number,'page_size',page_size);
 else raise exception 'Unsupported project directory action';end if;
end $function$
;
CREATE OR REPLACE FUNCTION private_website_lab.member_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid; tid uuid; url text; heading text; event text; rowdata jsonb:=to_jsonb(new); prior jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
begin
 if tg_table_name='website_project_interests' then
  perform private_website_lab.notify_member(new.user_id,'application:'||new.id,'Your application has been submitted','/member/projects/'||new.project_ref||'/interest');
 elsif tg_table_name='interest_reviews' then
  if new.status='approved' then return new;end if;
  if tg_op='INSERT' or new.status is distinct from old.status then
   select user_id into uid from public.website_project_interests where id=new.interest_id;
   perform private_website_lab.notify_member(uid,'review:'||new.interest_id||':'||new.status||':'||new.updated_at,'Your application has an update: '||new.status,'/member/applications');
  end if;
 elsif tg_table_name='website_project_team_members' then
  if tg_op='INSERT' or new.status is distinct from old.status or new.admitted_at is distinct from old.admitted_at or new.offer_expires_at is distinct from old.offer_expires_at then
   heading:=case when tg_op='UPDATE' and old.admitted_at is not null and new.admitted_at is null then 'Your Lab access has changed' when new.status='offered' then 'A project offer is ready for you' when new.status='confirmed' and new.admitted_at is not null and new.external_access_revoked_at is null and exists(select 1 from public.website_project_teams t where t.id=new.team_id and t.status='active' and t.lab_enabled) then 'Your Lab access is ready' when new.status='confirmed' then 'Your project place is confirmed' else 'Your project placement has changed' end;
   perform private_website_lab.notify_member(new.user_id,'placement:'||new.team_id||':'||new.status||':'||coalesce(new.admitted_at::text,'pending')||':'||coalesce(new.offer_expires_at::text,''),heading,'/member/lab');
  end if;
 elsif tg_table_name='website_project_teams' then
  if new.coordinator_nominee_id is not null and new.coordinator_nominee_id is distinct from old.coordinator_nominee_id then perform private_website_lab.notify_member(new.coordinator_nominee_id,'nomination:'||new.id||':'||clock_timestamp(),'Please review your coordinator nomination','/member/lab');end if;
  if new.coordinator_id is distinct from old.coordinator_id then
   for uid in select user_id from public.website_project_team_members where team_id=new.id and status='confirmed' loop perform private_website_lab.notify_member(uid,'coordinator:'||new.id||':'||clock_timestamp(),'Your project coordinator has changed','/member/lab');end loop;
  end if;
  if new.status is distinct from old.status then
   for uid in select user_id from public.website_project_team_members where team_id=new.id and status='confirmed' loop
    perform private_website_lab.notify_member(uid,'team:'||new.id||':'||new.status||':'||clock_timestamp(),'Your project is now '||new.status,'/member/lab');
   end loop;
  end if;
 elsif tg_table_name='items' then
  tid:=new.team_id;url:='/member/lab/'||tid;
  if new.kind in ('task','milestone') then
   if new.owner_id is not null and (tg_op='INSERT' or new.owner_id is distinct from old.owner_id) then
    perform private_website_lab.notify_member(new.owner_id,'assigned:'||new.id||':'||new.owner_id||':'||new.updated_at,'A '||new.kind||' has been assigned to you',url||'?view='||case when new.kind='task' then 'tasks#task-' else 'plan#milestone-' end||new.id,tid);
   end if;
   if tg_op='UPDATE' and new.status is distinct from old.status then
    if new.owner_id is not null then perform private_website_lab.notify_member(new.owner_id,'work:'||new.id||':'||new.status||':'||new.updated_at,case when new.status='done' then 'Your '||new.kind||' has been accepted' when old.status='ready_for_review' and new.status='in_progress' then 'Changes have been requested on your task' else 'Your '||new.kind||' is now '||replace(new.status,'_',' ') end,url||'?view='||case when new.kind='task' then 'tasks#task-' else 'plan#milestone-' end||new.id,tid);end if;
    if new.status='ready_for_review' then select coordinator_id into uid from public.website_project_teams where id=tid;if uid is not null and uid is distinct from new.owner_id then perform private_website_lab.notify_member(uid,'review-needed:'||new.id||':'||new.updated_at,'A task is ready for your review',url||'?view=tasks#task-'||new.id,tid);end if;end if;
   end if;
  elsif new.kind='message' and new.deleted_at is null then
   for uid in select m.user_id from public.website_project_team_members m where m.team_id=tid and m.status='confirmed' and m.admitted_at is not null and m.user_id<>new.author_id and (m.user_id=any(coalesce(new.mentioned_user_ids,'{}'::uuid[])) or new.pinned_at is not null) loop
    if tg_op='INSERT' or (uid=any(coalesce(new.mentioned_user_ids,'{}'::uuid[])) and not uid=any(coalesce(old.mentioned_user_ids,'{}'::uuid[]))) or (new.pinned_at is not null and old.pinned_at is null) then
     perform private_website_lab.notify_member(uid,'message:'||new.id||':'||case when uid=any(coalesce(new.mentioned_user_ids,'{}'::uuid[])) then 'mention' else 'announcement' end,case when uid=any(coalesce(new.mentioned_user_ids,'{}'::uuid[])) then 'You were mentioned in your team discussion' else 'Your team has an important announcement' end,url||'?view=chat#message-'||new.id,tid);
    end if;
   end loop;
  end if;
 elsif tg_table_name='meetings' then
  for uid in select user_id from public.website_project_team_members where team_id=new.team_id and status='confirmed' and admitted_at is not null and user_id<>new.organiser_id loop
   perform private_website_lab.notify_member(uid,'meeting:'||new.id||':'||new.revision,case when new.status='cancelled' then 'A team meeting has been cancelled' when tg_op='INSERT' then 'A team meeting has been scheduled' else 'A team meeting has changed' end,'/member/lab/'||new.team_id||'?view=events',new.team_id);
  end loop;
 elsif tg_table_name='support_replies' then
  if not new.internal then select reporter_id into uid from private_website_lab.support_cases where id=new.case_id;if uid<>new.author_id then perform private_website_lab.notify_member(uid,'support:'||new.id,'Mettelo has replied to your enquiry','/member/enquiries/'||new.case_id);end if;end if;
 elsif tg_table_name='users' then
  if new.email_confirmed_at is not null and (new.encrypted_password is distinct from old.encrypted_password or new.email is distinct from old.email) then perform private_website_lab.notify_member(new.id,'security:'||new.id||':'||clock_timestamp(),'Your account sign-in details have changed','/member/account');end if;
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION private_website_lab.capture_journey_mail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k text; since timestamptz;
begin
 select enabled_at into since from private_website_lab.journey_mail_settings where id and capture_enabled;
 if since is null or new.created_at<since then return new;end if;
 if tg_table_name='project_email_previews' then
  insert into private_website_lab.journey_mail(recipient_id,project_event_id,kind) values(new.recipient_id,new.id,new.kind) on conflict do nothing;
 else
  k:=case split_part(new.event_key,':',1)
   when 'approval' then 'application_approved' when 'support' then 'support_reply' when 'nomination' then 'coordinator_nomination'
   when 'market-request' then 'collaboration_request' when 'market-decision' then 'collaboration_decision'
   when 'market-leader-decision' then 'collaboration_decision' when 'market-removed' then 'collaboration_removed'
   when 'market-proposal' then 'proposal_decision' when 'email-test' then 'delivery_test' end;
  if split_part(new.event_key,':',1)='team' and split_part(new.event_key,':',3) in ('paused','completed') then k:='lab_status';end if;
  if split_part(new.event_key,':',1)='placement' and split_part(new.event_key,':',3)='left' then k:='placement_ended';end if;
  if k is not null then insert into private_website_lab.journey_mail(recipient_id,notification_id,kind) values(new.recipient_id,new.id,k) on conflict do nothing;end if;
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION private_website_lab.journey_mail_payload(job_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare j private_website_lab.journey_mail; n private_website_lab.notifications; p jsonb; target uuid; subject text; href text; r private_website_lab.market_requests; t public.website_project_teams;
begin
 select * into j from private_website_lab.journey_mail where id=job_id;
 if j.id is null or j.created_at<now()-interval '72 hours' or not private_website_lab.account_allowed(j.recipient_id)
 or not exists(select 1 from auth.users where id=j.recipient_id and email_confirmed_at is not null and deleted_at is null and email is not null and (banned_until is null or banned_until<=now())) then return null;end if;
 if j.project_event_id is not null then
  p:=private_website_lab.journey_project_event(j.project_event_id)->0;
  if p is null then return null;end if;
  if j.kind='offer_ready' then
   p:=p||jsonb_build_object('coordinator_nomination',exists(select 1 from public.website_project_teams where id=(p->>'team_id')::uuid and coordinator_nominee_id=j.recipient_id));
  end if;
  return p||jsonb_build_object('id',j.id,'kind',j.kind);
 end if;
 select * into n from private_website_lab.notifications where id=j.notification_id and recipient_id=j.recipient_id;
 if n.id is null then return null;end if;
 target:=split_part(n.event_key,':',2)::uuid;
 if j.kind='application_approved' then
  if not exists(select 1 from private_website_lab.interest_reviews r join public.website_project_interests i on i.id=r.interest_id where r.interest_id=target and r.status='approved' and i.user_id=j.recipient_id) then return null;end if;
 elsif j.kind='delivery_test' then
  if split_part(n.event_key,':',1)<>'email-test' or not private_website_lab.permitted(j.recipient_id,'operations') then return null;end if;
 elsif j.kind='support_reply' then
  if not exists(select 1 from private_website_lab.support_replies a join private_website_lab.support_cases c on c.id=a.case_id where a.id=target and not a.internal and c.reporter_id=j.recipient_id and a.author_id<>j.recipient_id) then return null;end if;
 elsif j.kind='coordinator_nomination' then
  select * into t from public.website_project_teams where id=target and coordinator_nominee_id=j.recipient_id and status in ('forming','active');
  if t.id is null then return null;end if;
  -- A nomination made together with an offer is included in that offer email.
  if exists(select 1 from private_website_lab.journey_mail q join private_website_lab.project_email_previews e on e.id=q.project_event_id where q.recipient_id=j.recipient_id and q.kind='offer_ready' and e.team_id=target and abs(extract(epoch from q.created_at-j.created_at))<5) then return null;end if;
 elsif j.kind in ('collaboration_request','collaboration_decision') then
  select * into r from private_website_lab.market_requests where id=target;
  select * into t from public.website_project_teams where id=r.team_id;
  if r.id is null or t.id is null or not private_website_lab.account_allowed(t.coordinator_id) or private_website_lab.market_blocked(r.member_id,t.coordinator_id)
   or not (j.recipient_id=r.member_id or j.recipient_id=t.coordinator_id) then return null;end if;
  if j.kind='collaboration_request' then
   if r.state<>'pending' or r.expires_at<=now() or t.status<>'active' or not t.lab_enabled or not private_website_lab.market_leader(t.id,t.coordinator_id)
    or (r.kind='invitation' and (j.recipient_id<>r.member_id or r.initiated_by<>t.coordinator_id)) or (r.kind='request' and j.recipient_id<>t.coordinator_id) then return null;end if;
  else
   if r.state<>split_part(n.event_key,':',3) or r.state='pending' then return null;end if;
   if r.state='accepted' and not exists(select 1 from public.website_project_team_members m where m.team_id=r.team_id and m.user_id=r.member_id and m.status='confirmed' and m.admitted_at is not null and m.external_access_revoked_at is null and t.status='active' and t.lab_enabled) then return null;end if;
  end if;
 elsif j.kind='collaboration_removed' then
  if exists(select 1 from public.website_project_team_members where team_id=target and user_id=j.recipient_id and status='confirmed') then return null;end if;
 elsif j.kind='proposal_decision' then
  if not exists(select 1 from private_website_lab.market_proposals where id=target and owner_id=j.recipient_id and state in ('approved','changes_requested','rejected') and version::text=split_part(n.event_key,':',3)) then return null;end if;
 elsif j.kind='lab_status' then
  if not exists(select 1 from public.website_project_teams t join public.website_project_team_members m on m.team_id=t.id where t.id=target and t.status=split_part(n.event_key,':',3) and m.user_id=j.recipient_id and m.status='confirmed' and m.admitted_at is not null and m.external_access_revoked_at is null) then return null;end if;
 elsif j.kind='placement_ended' then
  if not exists(select 1 from public.website_project_team_members where team_id=target and user_id=j.recipient_id and status='left' and admission_route='core') then return null;end if;
 else return null;end if;
 return jsonb_build_object('id',j.id,'kind',j.kind,'recipient_id',j.recipient_id,'email',(select email from auth.users where id=j.recipient_id),'title',n.title,'href',n.href);
end $function$
;
