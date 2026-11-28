-- Isolated committed fixtures required for independent-session contention.
-- Always run participation-race-cleanup.sql afterward, including on test failures.
begin;
do $$
declare uid uuid:=gen_random_uuid();staff uuid;b record;iid uuid;idx integer:=0;
begin
 if exists(select 1 from auth.users where email like 'participation-race-%@example.invalid') then raise exception 'Clean previous race fixtures first';end if;
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'participation-race-'||uid||'@example.invalid',now(),'{"full_name":"Synthetic participation race"}');
 for b in select project_ref,roles->>0 role_name from public.website_project_briefs order by project_ref limit (select lab_allowance+1 from private_website_lab.participation_policy where id) loop
  idx:=idx+1;
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(uid,b.project_ref,'solo',b.role_name,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes"}','2026-09-03-v1') returning id into iid;
  perform public.website_lab('review_interest',jsonb_build_object('interest_id',iid,'review_status','shortlisted'));
  if idx<=(select lab_allowance-1 from private_website_lab.participation_policy where id) then perform public.website_lab('form_group',jsonb_build_object('project_ref',b.project_ref,'label','[PARTICIPATION RACE] Baseline '||idx,'participation','solo','compatibility_reviewed','true','members',jsonb_build_array(jsonb_build_object('interest_id',iid,'role',b.role_name))));end if;
 end loop;
 if idx<>(select lab_allowance+1 from private_website_lab.participation_policy where id) then raise exception 'Insufficient race projects';end if;
end $$;
commit;
