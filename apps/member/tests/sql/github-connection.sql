-- Entire fixture rolls back; no external HTTP requests or actual GitHub invitations.
begin;
create temp table github_results(check_name text,passed boolean);
do $test$
#variable_conflict use_variable
declare staff uuid;ids uuid[]:='{}';apps uuid[]:='{}';uid uuid;iid uuid;gid text;identity uuid;ref text;role_name text;tid uuid;result jsonb;claim jsonb;denied boolean;k integer;original_username text;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select project_ref,roles->>0 into ref,role_name from public.website_project_briefs order by project_ref limit 1;
 update public.website_project_pilot_settings set max_active_teams=10,minimum_members=2 where project_ref=ref;
 for k in 1..3 loop
  uid:=gen_random_uuid();ids:=array_append(ids,uid);
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'github-rollback-'||uid||'@example.invalid',now(),'{"full_name":"GitHub test fixture","user_name":"forged-name","provider_id":"1"}');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);perform public.claim_member_username('gh_'||substr(replace(uid::text,'-',''),1,12));
  update public.profiles set github_url='https://github.com/forged-name' where id=uid;
 end loop;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[1],'role','authenticated')::text,true);
 result:=public.website_github('sync');assert result->>'connected'='false','Editable metadata or URL impersonated a GitHub identity';
 denied:=false;begin perform private_website_github.worker('claim',jsonb_build_object('user_id',ids[1]));exception when insufficient_privilege then denied:=true;end;assert denied,'Member reached trusted GitHub worker';
 assert not has_function_privilege('authenticated','public.website_github_worker(text,jsonb)','execute') and not has_table_privilege('authenticated','private_website_github.connections','update'),'Member can forge organisation verification';
 insert into github_results values('Typed URLs and editable metadata never verify GitHub; browser roles cannot record organisation membership',true);
 for k in 2..3 loop
  gid:=(800000000+floor(random()*100000000))::bigint::text;
  insert into auth.identities(id,user_id,provider,provider_id,identity_data) values(gen_random_uuid(),ids[k],'github',gid,jsonb_build_object('sub',gid,'user_name','fixture-'||k));
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[k],'role','authenticated')::text,true);result:=public.website_github('sync');assert result->>'connected'='true' and result->>'github_id'=gid,'Verified identity missing';
 end loop;
 select username into original_username from public.profiles where id=ids[2];
 update auth.identities set identity_data=jsonb_set(identity_data,'{user_name}','"renamed-fixture"') where user_id=ids[2] and provider='github';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[2],'role','authenticated')::text,true);result:=public.website_github('sync');
 assert result->>'login'='renamed-fixture' and (select username=original_username from public.profiles where id=ids[2]),'GitHub rename changed Mettelo username';
 insert into github_results values('Verified GitHub ID survives rename while the existing Mettelo username is unchanged',true);
 update private_website_github.policy set required_for_projects=true;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[1],'role','authenticated')::text,true);assert not public.website_my_github_eligible(),'Unconnected member passed eligibility';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[2],'role','authenticated')::text,true);assert public.website_my_github_eligible() and not private_website_github.lab_ready(ids[2]),'Connected means invitation accepted';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated')::text,true);
 for k in 2..3 loop
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(ids[k],ref,'team',role_name,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes","coordination_preference":"comfortable"}','2026-09-03-v1') returning id into iid;
  apps:=array_append(apps,iid);perform public.website_lab('review_interest',jsonb_build_object('interest_id',iid,'review_status','shortlisted'));
 end loop;
 tid:=(public.website_lab('form_group',jsonb_build_object('project_ref',ref,'label','[GITHUB ROLLBACK] Readiness','participation','team','compatibility_reviewed','true','nominee_id',ids[2],'members',jsonb_build_array(jsonb_build_object('interest_id',apps[1],'role',role_name),jsonb_build_object('interest_id',apps[2],'role',role_name))))->>'team_id')::uuid;
 for k in 2..3 loop perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[k],'role','authenticated')::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));end loop;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[2],'role','authenticated')::text,true);perform public.website_lab('agree_coordinator',jsonb_build_object('team_id',tid));
 assert (select status='forming' from public.website_project_teams where id=tid),'Lab opened before organisation membership';
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 for k in 2..3 loop
  claim:=public.website_github_worker('claim',jsonb_build_object('user_id',ids[k]));assert claim->>'lease' is not null,'Worker failed to claim';
  result:=public.website_github_worker('claim',jsonb_build_object('user_id',ids[k]));assert result->>'skip'='true','Concurrent callback claimed twice';
  perform public.website_github_worker('finish',jsonb_build_object('user_id',ids[k],'lease',claim->>'lease','github_id',claim->>'github_id','login',claim->>'login','org_status','member'));
 end loop;
 assert (select status='active' from public.website_project_teams where id=tid),'Last GitHub acceptance did not automatically open Lab';
 assert (select count(*)=2 from public.website_project_team_members where team_id=tid and admitted_at is not null),'Membership activation incomplete';
 insert into github_results values('Connected accounts may apply; pending invitations cannot open a Lab; confirmed GitHub membership opens it automatically and concurrent checks have one lease',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated')::text,true);result:=public.website_manage_members('detail',jsonb_build_object('user_id',ids[2]));assert result->'github'->>'login'='renamed-fixture' and result->'github'->>'org_status'='member','Admin record lacks GitHub';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[1],'role','authenticated')::text,true);
 denied:=false;begin perform public.website_manage_members('detail',jsonb_build_object('user_id',ids[2]));exception when insufficient_privilege then denied:=true;end;assert denied,'Member accessed another private admin record';
 update auth.identities set provider_id=provider_id||'8' where user_id=ids[2] and provider='github';assert not private_website_github.lab_ready(ids[2]),'Removed identity retained Lab eligibility';
 insert into github_results values('Administrators see the verified GitHub account and organisation state; unrelated members cannot access it and disconnected identities lose eligibility',true);
end $test$;
select * from github_results;
rollback;
