-- Readiness labels must describe the same policy as admission. Fixtures roll back.
begin;
create temp table readiness_label_results(check_name text,passed boolean);
do $test$
declare ref text;role_name text;tid uuid;uid uuid;iid uuid;staff uuid;k integer;r jsonb;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select project_ref,roles->>0 into ref,role_name from public.website_project_briefs order by project_ref limit 1;
 insert into public.website_project_teams(project_ref,label,participation,minimum_members,maximum_members,two_person_reason,two_person_approved_by,two_person_approved_at)
 values(ref,'[ROLLBACK READINESS LABELS] Policy checks','team',3,4,'Synthetic approved two-person exception',staff,now()) returning id into tid;
 for k in 1..2 loop
  uid:=gen_random_uuid();
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'readiness-label-'||uid||'@example.invalid',now(),'{"full_name":"Readiness label fixture"}');
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version)
  values(uid,ref,'team',role_name,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes"}','2026-09-03-v1') returning id into iid;
  insert into public.website_project_team_members(team_id,interest_id,user_id,project_ref,role,responsibilities,status,acknowledged_at)
  values(tid,iid,uid,ref,role_name,array[role_name],'confirmed',now());
 end loop;
 update private_website_github.policy set required_for_projects=false where id;
 r:=private_website_lab.readiness(tid);
 insert into readiness_label_results select 'Disabled GitHub policy is not displayed as an outstanding GitHub requirement',coalesce((x->>'ready')::boolean,false) from jsonb_array_elements(r->'checks')x where x->>'label'='GitHub organisation membership';
 insert into readiness_label_results select 'Two-person exception stays pending while either confirmed member has not agreed',not coalesce((x->>'ready')::boolean,true) from jsonb_array_elements(r->'checks')x where x->>'label'='Two-person agreement, if needed';
 update public.website_project_team_members set two_person_agreed_at=now() where team_id=tid;
 r:=private_website_lab.readiness(tid);
 insert into readiness_label_results select 'Two-person agreement is complete after both actual agreements',coalesce((x->>'ready')::boolean,false) from jsonb_array_elements(r->'checks')x where x->>'label'='Two-person agreement, if needed';
 update private_website_github.policy set required_for_projects=true where id;
 r:=private_website_lab.readiness(tid);
 insert into readiness_label_results select 'Enabled GitHub policy still blocks unlinked members',not coalesce((x->>'ready')::boolean,true) from jsonb_array_elements(r->'checks')x where x->>'label'='GitHub organisation membership';
 insert into readiness_label_results values('Incomplete readiness grants no workspace or admission',not (r->>'ready')::boolean and not exists(select 1 from public.website_project_team_members where team_id=tid and admitted_at is not null));
end $test$;
do $verify$
begin
 assert (select count(*)=5 and bool_and(passed) from readiness_label_results),'Readiness policy labels disagree with the required actions';
end $verify$;
select * from readiness_label_results;
rollback;
