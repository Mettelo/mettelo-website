create or replace function private_website_lab.application_approval(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();i public.website_project_interests;r private_website_lab.interest_reviews;
 route text;role_name text;tid uuid;members uuid[];result jsonb;failure text;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not private_website_lab.account_allowed(actor) or not private_website_lab.permitted(actor,'operations') then raise exception 'Project administrator access required' using errcode='42501';end if;
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
