-- All users, settings, memberships, events and audits roll back. No provider requests.
begin;
create temp table guided_results(check_name text,passed boolean);
do $test$
#variable_conflict use_variable
declare staff uuid;ref text;roles text[];ids uuid[]:='{}';apps uuid[]:='{}';uid uuid;iid uuid;tid uuid;tid2 uuid;result jsonb;k integer;denied boolean;initial_min integer;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select b.project_ref,array(select jsonb_array_elements_text(b.roles)) into ref,roles from public.website_project_briefs b order by b.project_ref limit 1;
 update public.website_project_pilot_settings set max_active_teams=10 where project_ref=ref;
 for k in 1..6 loop
  uid:=gen_random_uuid();insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'guided-rollback-'||uid||'@example.invalid',now(),'{"full_name":"Guided readiness fixture"}');
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(uid,ref,'team',roles[1],repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes","coordination_preference":"comfortable"}','2026-09-03-v1') returning id into iid;
  ids:=array_append(ids,uid);apps:=array_append(apps,iid);
 end loop;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 denied:=false;begin perform public.website_lab('project_start_policy',jsonb_build_object('project_ref',ref,'minimum_members',2,'reason','Unauthorised policy change'));exception when insufficient_privilege then denied:=true;end;assert denied,'Member changed project minimum';
 perform set_config('request.jwt.claim.sub',staff::text,true);
 perform public.website_lab('project_start_policy',jsonb_build_object('project_ref',ref,'minimum_members',2,'reason','Synthetic two-member project policy'));
 for k in 1..3 loop perform public.website_lab('review_interest',jsonb_build_object('interest_id',apps[k],'review_status','shortlisted'));end loop;
 tid:=(public.website_lab('form_group',jsonb_build_object('project_ref',ref,'label','[ROLLBACK] Configured two minimum','participation','team','compatibility_reviewed','true','nominee_id',ids[1],'required_roles',to_jsonb(roles[1:1]),'members',jsonb_build_array(jsonb_build_object('interest_id',apps[1],'role',roles[1]),jsonb_build_object('interest_id',apps[2],'role',roles[1]),jsonb_build_object('interest_id',apps[3],'role',roles[1]))))->>'team_id')::uuid;
 assert (select minimum_members=2 and two_person_reason is null from public.website_project_teams where id=tid),'Project minimum not inherited';
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));perform public.website_lab('agree_coordinator',jsonb_build_object('team_id',tid));
 assert (select status='forming' from public.website_project_teams where id=tid),'One member opened a two-person Lab';
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);result:=public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));
 assert result->'activation'->>'activated'='true' and (select status='active' from public.website_project_teams where id=tid),'Second acceptance did not open Lab';
 assert (select count(*)=2 from public.website_project_team_members where team_id=tid and admitted_at is not null),'Incorrect admission count';
 assert not exists(select 1 from public.website_project_team_members where team_id=tid and access_verified_at is not null),'External access verification fabricated';
 perform public.website_lab('workspace',jsonb_build_object('team_id',tid));
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);
 denied:=false;begin perform public.website_lab('workspace',jsonb_build_object('team_id',tid));exception when insufficient_privilege then denied:=true;end;assert denied,'Unanswered offer accessed Lab';
 perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));
 assert (select admitted_at is not null from public.website_project_team_members where team_id=tid and user_id=ids[3]),'Later official acceptance needs admin admission';
 assert (select count(*)=1 from private_website_lab.audit where team_id=tid and action='automatic_lab_start'),'Start audit duplicated';
 insert into guided_results values('Configured minimum of two opens on second acceptance; unanswered offers grant no access; later acceptance admits once without fabricating repository checks',true);
 -- Directly approved applications are placements, not invented member commitments.
 perform set_config('request.jwt.claim.sub',staff::text,true);
 for k in 4..6 loop perform public.website_project_approval('approve',jsonb_build_object('interest_id',apps[k]));end loop;
 tid2:=(public.website_lab('form_group',jsonb_build_object('project_ref',ref,'label','[ROLLBACK] Approved pair','participation','team','compatibility_reviewed','true','nominee_id',ids[4],'required_roles',to_jsonb(roles[1:1]),'members',jsonb_build_array(jsonb_build_object('interest_id',apps[4],'role',roles[1]),jsonb_build_object('interest_id',apps[5],'role',roles[1]),jsonb_build_object('interest_id',apps[6],'role',roles[1]))))->>'team_id')::uuid;
 for k in 5..6 loop perform set_config('request.jwt.claim.sub',ids[k]::text,true);perform public.website_lab('confirm_commitment',jsonb_build_object('team_id',tid2));end loop;
 assert (select status='forming' from public.website_project_teams where id=tid2),'Coordinator agreement bypassed';
 perform set_config('request.jwt.claim.sub',ids[4]::text,true);perform public.website_lab('agree_coordinator',jsonb_build_object('team_id',tid2));
 assert (select status='forming' from public.website_project_teams where id=tid2),'Uncommitted coordinator allowed to own an active Lab';
 perform public.website_lab('confirm_commitment',jsonb_build_object('team_id',tid2));
 assert (select status='active' from public.website_project_teams where id=tid2),'Approved team failed to activate on final commitment';
 perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('placement_status',jsonb_build_object('team_id',tid2,'status','paused','reason','Synthetic deliberate pause'));
 perform set_config('request.jwt.claim.sub',ids[4]::text,true);perform public.website_lab('confirm_commitment',jsonb_build_object('team_id',tid2));assert (select status='paused' from public.website_project_teams where id=tid2),'Paused Lab resumed';
 assert not has_function_privilege('authenticated','private_website_lab.operations_before_guided_readiness(text,jsonb)','execute'),'Internal control exposed';
 insert into guided_results values('Approved members still confirm commitments and coordination; paused Labs stay paused and private helpers stay inaccessible',true);
end $test$;
select * from guided_results;
rollback;
