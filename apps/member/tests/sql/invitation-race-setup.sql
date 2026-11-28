-- Separate sessions need committed fixtures. Always run invitation-race-cleanup.sql.
-- Run only against isolated staging, with operational email delivery disabled.
-- Create the two synthetic identities with Auth Admin first, then replace the
-- UUID placeholders. Direct auth.users fixtures cannot establish Auth sessions.
begin;
create function pg_temp.race_offer(staff uuid,uid uuid,ref text) returns uuid language plpgsql as $$
declare iid uuid;role_name text;tid uuid;
begin
 select roles->>0 into role_name from public.website_project_briefs where project_ref=ref;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version)
 values(uid,ref,'solo',role_name,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes"}','2026-09-03-v1') returning id into iid;
 perform public.website_lab('review_interest',jsonb_build_object('interest_id',iid,'review_status','shortlisted'));
 tid:=(public.website_lab('form_group',jsonb_build_object('project_ref',ref,'label','[UAT INVITATION RACE] '||gen_random_uuid(),'participation','solo','compatibility_reviewed','true','required_roles',jsonb_build_array(role_name),'members',jsonb_build_array(jsonb_build_object('interest_id',iid,'role',role_name))))->>'team_id')::uuid;
 return tid;
end $$;
do $setup$
declare member_id uuid:='__MEMBER_ID__';leader_id uuid:='__LEADER_ID__';staff uuid;refs text[];tid uuid;role_name text;k integer;
begin
 if (select count(*) from auth.users where email like 'uat-invitation-race-%@example.invalid')<>2
 or not exists(select 1 from auth.users where id=member_id and email like 'uat-invitation-race-member-%@example.invalid')
 or not exists(select 1 from auth.users where id=leader_id and email like 'uat-invitation-race-leader-%@example.invalid') then raise exception 'Synthetic Auth fixture boundary mismatch';end if;
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 if private_website_lab.participation_allowance(member_id)<>3 then raise exception 'This race expects the standard three-slot policy';end if;
 select array_agg(project_ref order by project_ref) into refs from (
 select b.project_ref from public.website_project_briefs b join public.website_project_pilot_settings s using(project_ref)
 where jsonb_array_length(b.roles)>0 and (select count(*) from public.website_project_teams t where t.project_ref=b.project_ref and t.status='active')<s.max_active_teams
 order by b.project_ref limit 4)x;
 if cardinality(refs)<>4 then raise exception 'Four fixture projects required';end if;
 perform set_config('request.jwt.claim.sub',member_id::text,true);
 perform public.website_lab_market('preferences','{"discoverable":true,"contactable":true}');
 for k in 1..2 loop perform pg_temp.race_offer(staff,member_id,refs[k]);end loop;
 for k in 3..4 loop
  tid:=pg_temp.race_offer(staff,leader_id,refs[k]);
  perform set_config('request.jwt.claim.sub',leader_id::text,true);
  perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));
  perform set_config('request.jwt.claim.sub',staff::text,true);
  perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',leader_id,'reason','Synthetic invitation race fixture only'));
  perform public.website_lab_market('capacity',jsonb_build_object('team_id',tid,'capacity',1));
  select roles->>0 into role_name from public.website_project_briefs where project_ref=refs[k];
  perform set_config('request.jwt.claim.sub',leader_id::text,true);
  perform public.website_lab_market('recruitment',jsonb_build_object('team_id',tid,'open',true,'description','Synthetic invitation race fixture only.','commitment','Synthetic test only','roles',jsonb_build_array(role_name)));
  perform public.website_lab_market('invite',jsonb_build_object('team_id',tid,'member_id',member_id,'role',role_name,'proposal','Synthetic concurrent invitation acceptance test only.','commitment','Synthetic test only'));
 end loop;
 if private_website_lab.participation_usage(member_id)->>'used'<>'2' then raise exception 'Pending invitations changed baseline usage';end if;
 -- A short-lived invoker wrapper proves overlap through the normal HTTP API.
 -- Only this synthetic member can call it; it grants no additional authority.
 execute format($ddl$
 create function public.website_uat_invitation_race(request_id uuid) returns jsonb
 language plpgsql security invoker set search_path='' as $body$
 declare started timestamptz:=clock_timestamp();outcome text;
 begin
  if auth.uid() is distinct from %L::uuid then raise exception 'Synthetic race account required' using errcode='42501';end if;
  begin
   perform public.website_lab_market('accept',jsonb_build_object('request_id',request_id));
   perform pg_sleep(5);
   outcome:='accepted';
  exception when raise_exception then
   if sqlerrm not like 'Lab participation limit reached%%' then raise;end if;
   outcome:='blocked at allowance';
  end;
  return jsonb_build_object('backend',pg_backend_pid(),'started',started,'finished',clock_timestamp(),'outcome',outcome);
 end $body$;
 $ddl$,member_id);
 revoke all on function public.website_uat_invitation_race(uuid) from public,anon;
 grant execute on function public.website_uat_invitation_race(uuid) to authenticated;
end $setup$;
notify pgrst,'reload schema';
commit;
