begin;
-- Readiness stays authoritative; no access check is inferred from member acceptance.
do $upgrade$
declare definition text;
begin
 definition:=pg_get_functiondef('private_website_lab.readiness(uuid)'::regprocedure);
 if strpos(definition,'return jsonb_build_object(''checks'',checks')=0 then raise exception 'Unexpected readiness contract';end if;
 definition:=replace(definition,'return jsonb_build_object(''checks'',checks',$checks$checks:=checks||jsonb_build_array(
  jsonb_build_object('label','Member access available','ready',not exists(select 1 from public.website_project_team_members m where m.team_id=tid and m.status='confirmed' and not private_website_lab.account_allowed(m.user_id))),
  jsonb_build_object('label','Lab capacity available','ready',t.status in ('active','completed') or (select count(*) from public.website_project_teams where project_ref=t.project_ref and status='active' and id<>tid)<(select max_active_teams from public.website_project_pilot_settings where project_ref=t.project_ref)));
 return jsonb_build_object('checks',checks$checks$);
 execute definition;
end $upgrade$;

create function private_website_lab.activate_ready_placement(tid uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();t public.website_project_teams;ready jsonb;
begin
 if actor is null or not private_website_lab.account_allowed(actor) then raise exception 'Verified account access required' using errcode='42501';end if;
 select * into t from public.website_project_teams where id=tid for update;
 -- Paused and completed work never resumes as a side effect of another action.
 if t.id is null or t.status<>'forming' then return jsonb_build_object('activated',false);end if;
 if not private_website_lab.permitted(actor,'operations') and not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status in ('confirmed','declined')) then raise exception 'Placement access required' using errcode='42501';end if;
 if not t.lab_enabled and exists(select 1 from public.website_project_team_members where team_id=tid and user_id=t.coordinator_id and status='confirmed') and (t.participation='solo' or t.coordinator_agreed_at is not null) then
  if not exists(select 1 from private_website_lab.items where team_id=tid and kind='milestone') then
   insert into private_website_lab.items(team_id,kind,title,body,author_id,owner_id) values(tid,'milestone','Kickoff and agree delivery plan','Review the brief, confirm responsibilities and agree the first delivery milestone.',actor,t.coordinator_id);
  end if;
  update public.website_project_teams set lab_enabled=true where id=tid;
 end if;
 ready:=private_website_lab.readiness(tid);
 if ready->>'ready' is distinct from 'true' then return jsonb_build_object('activated',false,'readiness',ready);end if;
 begin
  -- The existing activation trigger checks role coverage, repository access and project capacity again.
  update public.website_project_teams set status='active' where id=tid;
  update public.website_project_team_members set admitted_at=coalesce(admitted_at,now()),onboarding_checked_at=coalesce(onboarding_checked_at,now()) where team_id=tid and status='confirmed';
  insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,'automatic_lab_start',tid,jsonb_build_object('readiness_checked',true,'participation',t.participation));
 exception when raise_exception then
  if sqlerrm='Active team capacity reached' then return jsonb_build_object('activated',false,'capacity_pending',true);end if;
  raise;
 end;
 return jsonb_build_object('activated',true,'team_id',tid,'participation',t.participation);
end $$;
revoke all on function private_website_lab.activate_ready_placement(uuid) from public,anon,authenticated;

-- Preserve the existing action-specific authority before evaluating automatic activation.
alter function private_website_lab.operations(text,jsonb) rename to operations_before_ready_activation;
revoke all on function private_website_lab.operations_before_ready_activation(text,jsonb) from public,anon,authenticated;
create function private_website_lab.operations(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();tid uuid:=nullif(p_payload->>'team_id','')::uuid;result jsonb;activation jsonb;
begin
 if p_action='prepare_workspace' and private_website_lab.permitted(actor,'operations') and exists(select 1 from public.website_project_teams where id=tid and status='active' and lab_enabled) then return jsonb_build_object('ok',true,'already_prepared',true);end if;
 result:=private_website_lab.operations_before_ready_activation(p_action,p_payload);
 if p_action='assign_item' and tid is null then select team_id into tid from private_website_lab.items where id=(p_payload->>'item_id')::uuid;end if;
 if p_action='mine' then
  return coalesce((select jsonb_agg(x||jsonb_build_object('requested_participation',i.participation,'readiness',private_website_lab.readiness(m.team_id))) from jsonb_array_elements(result) x join public.website_project_team_members m on m.team_id=(x->>'team_id')::uuid and m.user_id=actor join public.website_project_interests i on i.id=m.interest_id),'[]');
 end if;
 if tid is not null and p_action in ('respond','confirm_commitment','agree_coordinator','agree_two','verify_access','allow_two','prepare_workspace','add_item','assign_item','expire_offer','admit_member') then
  -- A decline/expiry can clear the last unanswered offer; only authorised staff or remaining members may activate.
  if private_website_lab.permitted(actor,'operations') or exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and (status='confirmed' or (p_action='respond' and p_payload->>'response'='decline' and status='declined'))) then
   activation:=private_website_lab.activate_ready_placement(tid);
   return coalesce(result,'{}')||jsonb_build_object('activation',activation);
  end if;
 end if;
 return result;
end $$;
revoke all on function private_website_lab.operations(text,jsonb) from public,anon,authenticated;
grant execute on function private_website_lab.operations(text,jsonb) to authenticated;
create or replace function public.website_lab(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.operations(p_action,p_payload)$$;
notify pgrst,'reload schema';
commit;
