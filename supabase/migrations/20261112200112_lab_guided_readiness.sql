-- Internal Lab admission is separate from external repository permission evidence.
alter table public.website_project_pilot_settings add column minimum_members integer not null default 3 check(minimum_members between 2 and 12 and minimum_members<=member_capacity);
-- Existing team minima are preserved; administrators explicitly change a forming team.
do $upgrade$
declare source text;c record;
begin
 for c in select conname from pg_constraint where conrelid='public.website_project_teams'::regclass and contype='c' and pg_get_constraintdef(oid) like '%minimum_members%' loop execute format('alter table public.website_project_teams drop constraint %I',c.conname);end loop;
 alter table public.website_project_teams add constraint team_configured_minimum check((participation='solo' and minimum_members=1) or (participation='team' and minimum_members between 2 and maximum_members));
 source:=pg_get_functiondef('public.website_validate_pilot_team()'::regprocedure);
 if strpos(source,'Normal minimum is three for teams and one for solo')=0 then raise exception 'Unexpected activation guard';end if;
 source:=replace(source,'if new.minimum_members<>(case when new.participation=''solo'' then 1 else 3 end) then raise exception ''Normal minimum is three for teams and one for solo'';end if;','if (new.participation=''solo'' and new.minimum_members<>1) or (new.participation=''team'' and new.minimum_members not between 2 and new.maximum_members) then raise exception ''Choose a valid Lab starting minimum'';end if;');
 source:=replace(source,'when new.two_person_reason is not null then 2 else 3 end','when new.two_person_reason is not null then 2 else new.minimum_members end');
 source:=replace(source,'if filled=2 and new.participation=''team'' and exists','if filled=2 and new.participation=''team'' and new.two_person_reason is not null and exists');
 source:=replace(source,'(acknowledged_at is null or access_verified_at is null)','(acknowledged_at is null or commitment_confirmed_at is null)');
 source:=replace(source,'where team_id=new.id and admission_route=''core'' and status=''confirmed'';','where team_id=new.id and admission_route=''core'' and status=''confirmed'' and acknowledged_at is not null and commitment_confirmed_at is not null;');
 source:=replace(source,'and (acknowledged_at is null or commitment_confirmed_at is null)','and commitment_confirmed_at is not null and acknowledged_at is null');
 source:=replace(source,'and r=any(responsibilities)','and commitment_confirmed_at is not null and r=any(responsibilities)');
 source:=replace(source,'Confirm member acceptance and repository access','Confirm member acceptance and working commitment');execute source;
 source:=pg_get_functiondef('private_website_lab.readiness(uuid)'::regprocedure);
 source:=replace(source,'when t.two_person_reason is not null then 2 else 3 end','when t.two_person_reason is not null then 2 else t.minimum_members end');
 source:=replace(source,'where team_id=tid and admission_route=''core'' and status=''confirmed'';','where team_id=tid and admission_route=''core'' and status=''confirmed'' and acknowledged_at is not null and commitment_confirmed_at is not null;');
 source:=replace(source,'and r=any(responsibilities)','and commitment_confirmed_at is not null and r=any(responsibilities)');
 source:=replace(source,'jsonb_build_object(''label'',''Working commitments confirmed'',''ready'',filled>0 and not exists(select 1 from public.website_project_team_members where team_id=tid and admission_route=''core'' and status=''confirmed'' and commitment_confirmed_at is null))','jsonb_build_object(''label'',''Working commitments confirmed'',''ready'',filled>=need)');
 source:=replace(source,'jsonb_build_object(''label'',''No unanswered offers'',''ready'',not exists(select 1 from public.website_project_team_members where team_id=tid and admission_route=''core'' and status=''offered'')),','');
 source:=replace(source,'jsonb_build_object(''label'',''Repository access checked'',''ready'',filled>0 and not exists(select 1 from public.website_project_team_members where team_id=tid and admission_route=''core'' and status=''confirmed'' and access_verified_at is null)),','');execute source;
 -- The reviewed formation path uses the configurable project default, not a hardcoded three.
 source:=pg_get_functiondef('private_website_lab.admission(text,jsonb)'::regprocedure);
 if strpos(source,'else 3 end) or n>')=0 then raise exception 'Unexpected formation minimum contract';end if;
 source:=replace(source,'else 3 end) or n>','else (select minimum_members from public.website_project_pilot_settings where project_ref=ref) end) or n>');
 source:=replace(source,'set maximum_members=cap,coordinator_nominee_id=','set minimum_members=case when a=''solo'' then 1 else (select minimum_members from public.website_project_pilot_settings where project_ref=ref) end,maximum_members=cap,coordinator_nominee_id=');
 source:=replace(source,'if a=''team'' and n=2 then update','if a=''team'' and n=2 and (select minimum_members from public.website_project_pilot_settings where project_ref=ref)>2 then update');execute source;
 source:=pg_get_functiondef('private_website_lab.control(text,jsonb)'::regprocedure);
 source:=replace(source,'when t.two_person_reason is not null then 2 else 3 end','when t.two_person_reason is not null then 2 else t.minimum_members end');execute source;
 source:=pg_get_functiondef('private_website_lab.project_admin_directory(text,jsonb)'::regprocedure);
 source:=replace(source,'''member_capacity'',s.member_capacity','''member_capacity'',s.member_capacity,''minimum_members'',s.minimum_members');execute source;
end $upgrade$;

-- Run only after the existing action-specific permission checks. Never overwrite external checks.
create or replace function private_website_lab.activate_ready_placement(tid uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();t public.website_project_teams;ready jsonb;users uuid[];mid uuid;joined uuid;joined_ids uuid[]:='{}';
begin
 if actor is null or not private_website_lab.account_allowed(actor) then raise exception 'Verified account access required' using errcode='42501';end if;
 select array_agg(distinct user_id order by user_id) into users from public.website_project_team_members where team_id=tid;
 perform private_website_lab.participation_locks(users);
 select * into t from public.website_project_teams where id=tid for update;
 if t.id is null or t.status not in ('forming','active') then return jsonb_build_object('activated',false);end if;
 if not private_website_lab.permitted(actor,'operations') and not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status in ('confirmed','declined')) then raise exception 'Placement access required' using errcode='42501';end if;
 if t.status='forming' then
  if not t.lab_enabled and exists(select 1 from public.website_project_team_members where team_id=tid and user_id=t.coordinator_id and admission_route='core' and status='confirmed') and (t.participation='solo' or t.coordinator_agreed_at is not null) then
   if not exists(select 1 from private_website_lab.items where team_id=tid and kind='milestone') then
    insert into private_website_lab.items(team_id,kind,title,body,author_id,owner_id) values(tid,'milestone','Kickoff and agree delivery plan','Review the brief, confirm responsibilities and agree the first delivery milestone.',actor,t.coordinator_id);
   end if;
   update public.website_project_teams set lab_enabled=true where id=tid;
  end if;
  ready:=private_website_lab.readiness(tid);
  if ready->>'ready' is distinct from 'true' then return jsonb_build_object('activated',false,'readiness',ready);end if;
  begin
   update public.website_project_teams set status='active' where id=tid;
  exception when raise_exception then
   if sqlerrm='Active team capacity reached' then return jsonb_build_object('activated',false,'capacity_pending',true);end if;raise;
  end;
 end if;
 -- Later official members enter once they confirm; unanswered offers themselves grant nothing.
 for joined in select m.user_id from public.website_project_team_members m where m.team_id=tid and m.admission_route='core' and m.status='confirmed' and m.admitted_at is null and m.acknowledged_at is not null and m.commitment_confirmed_at is not null and private_website_lab.account_allowed(m.user_id) and not exists(select 1 from private_website_lab.placement_restrictions r where r.user_id=m.user_id and r.project_ref=m.project_ref and r.cleared_at is null) loop
  update public.website_project_team_members set admitted_at=now(),onboarding_checked_at=now() where team_id=tid and user_id=joined;
  joined_ids:=array_append(joined_ids,joined);
  for mid in select id from private_website_lab.meetings where team_id=tid and status='scheduled' and starts_at>now() loop perform private_website_lab.queue_meeting(mid,joined);end loop;
 end loop;
 if t.status='forming' or cardinality(joined_ids)>0 then
  insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,case when t.status='forming' then 'automatic_lab_start' else 'automatic_member_admission' end,tid,jsonb_build_object('readiness_checked',true,'admitted_users',to_jsonb(joined_ids),'external_access_changed',false));
 end if;
 return jsonb_build_object('activated',t.status='forming','admitted',cardinality(joined_ids),'team_id',tid);
end $$;
revoke all on function private_website_lab.activate_ready_placement(uuid) from public,anon,authenticated;

alter function private_website_lab.operations(text,jsonb) rename to operations_before_guided_readiness;
revoke all on function private_website_lab.operations_before_guided_readiness(text,jsonb) from public,anon,authenticated;
create function private_website_lab.operations(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();tid uuid:=nullif(p_payload->>'team_id','')::uuid;n integer;cap integer;before_min integer;ref text:=p_payload->>'project_ref';result jsonb;u uuid[];
begin
 if actor is null or not private_website_lab.account_allowed(actor) then raise exception 'Verified account access required' using errcode='42501';end if;
 if p_action in ('project_start_policy','team_start_policy') then
  if not private_website_lab.permitted(actor,'operations') then raise exception 'Project administrator required' using errcode='42501';end if;
  if length(btrim(coalesce(p_payload->>'reason','')))<8 then raise exception 'Explain the starting minimum change';end if;
  n:=(p_payload->>'minimum_members')::integer;
  if p_action='team_start_policy' then
   select array_agg(distinct user_id order by user_id) into u from public.website_project_team_members where team_id=tid;perform private_website_lab.participation_locks(u);
   select project_ref,maximum_members,minimum_members into ref,cap,before_min from public.website_project_teams where id=tid and participation='team' and status='forming' for update;
  else select member_capacity,minimum_members into cap,before_min from public.website_project_pilot_settings where project_ref=ref for update;end if;
  if cap is null or n is null or n not between 2 and cap then raise exception 'Choose a minimum between two and the team capacity';end if;
  if p_action='team_start_policy' then update public.website_project_teams set minimum_members=n where id=tid;
  else update public.website_project_pilot_settings set minimum_members=n where project_ref=ref;end if;
  insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,tid,jsonb_build_object('project_ref',ref,'before_minimum',before_min,'minimum_members',n,'reason',left(p_payload->>'reason',500)));
  return jsonb_build_object('ok',true,'activation',case when tid is not null then private_website_lab.activate_ready_placement(tid) else '{}'::jsonb end);
 end if;
 result:=private_website_lab.operations_before_guided_readiness(p_action,p_payload);
 if p_action='form_group' then
  tid:=(result->>'team_id')::uuid;
  if tid is not null then return result||jsonb_build_object('activation',private_website_lab.activate_ready_placement(tid));end if;
 end if;
 return result;
end $$;
revoke all on function private_website_lab.operations(text,jsonb) from public,anon;
grant execute on function private_website_lab.operations(text,jsonb) to authenticated;
notify pgrst,'reload schema';
