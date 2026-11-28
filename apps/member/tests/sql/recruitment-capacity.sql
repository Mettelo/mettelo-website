-- Official workflow, lifecycle and privilege assertions. Every fixture rolls back.
begin;
create temp table participation_results(check_name text,passed boolean);
create function pg_temp.fixture_offer(staff uuid,uid uuid,ref text) returns uuid language plpgsql as $$
declare iid uuid;role_name text;tid uuid;
begin
 select roles->>0 into role_name from public.website_project_briefs where project_ref=ref;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 select id into iid from public.website_project_interests where user_id=uid and project_ref=ref;
 if iid is null then
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(uid,ref,'solo',role_name,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes"}','2026-09-03-v1') returning id into iid;
 end if;
 perform public.website_lab('review_interest',jsonb_build_object('interest_id',iid,'review_status','shortlisted'));
 tid:=(public.website_lab('form_group',jsonb_build_object('project_ref',ref,'label','[ROLLBACK PARTICIPATION] '||gen_random_uuid(),'participation','solo','compatibility_reviewed','true','required_roles',jsonb_build_array(role_name),'members',jsonb_build_array(jsonb_build_object('interest_id',iid,'role',role_name))))->>'team_id')::uuid;
 return tid;
end $$;
create temp table recruitment_results(check_name text,passed boolean);
do $test$
declare staff uuid;owner uuid:=gen_random_uuid();joiner uuid:=gen_random_uuid();tid uuid;ref text;role_name text;r jsonb;denied boolean;req uuid;other_owner uuid:=gen_random_uuid();other_tid uuid;before_count bigint;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select project_ref,roles->>0 into ref,role_name from public.website_project_briefs order by project_ref limit 1;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) select x,'recruitment-rollback-'||x||'@example.invalid',now(),'{"full_name":"Recruitment rollback fixture"}' from unnest(array[owner,joiner])x;
 tid:=pg_temp.fixture_offer(staff,owner,ref);
 perform set_config('request.jwt.claim.sub',owner::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));
 perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',owner,'reason','Synthetic recruitment access verification'));
 perform set_config('request.jwt.claim.sub',owner::text,true);
 r:=public.website_lab_market('my_labs');assert exists(select 1 from jsonb_array_elements(r)x where x->>'team_id'=tid::text),'Authorised owner cannot select Lab';
 r:=public.website_lab_market('manage',jsonb_build_object('team_id',tid));assert r->>'can_manage'='true' and r->'recruitment'='null'::jsonb,'Missing capacity was misreported';
 denied:=false;begin perform public.website_lab_market('recruitment',jsonb_build_object('team_id',tid,'open',true,'description','[ROLLBACK RECRUITMENT] Public opportunity for SQL collaboration.','roles',jsonb_build_array(role_name),'skills',jsonb_build_array('SQL'),'commitment','Three hours weekly'));exception when raise_exception then assert sqlerrm='An administrator must set collaboration capacity first','Wrong capacity failure';denied:=true;end;assert denied,'No-capacity recruitment opened';
 insert into recruitment_results values('Authorised Lab selection works; absent capacity correctly blocks publication with the precise capacity error',true);
 denied:=false;begin perform public.website_lab_market('capacity',jsonb_build_object('team_id',tid,'capacity',2));exception when insufficient_privilege then denied:=true;end;assert denied,'Owner increased their own capacity';
 perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab_market('capacity',jsonb_build_object('team_id',tid,'capacity',2));
 perform set_config('request.jwt.claim.sub',owner::text,true);r:=public.website_lab_market('manage',jsonb_build_object('team_id',tid));assert r->'recruitment'->>'collaborator_capacity'='2' and r->>'occupied'='0','Approved capacity not retrieved accurately';
 perform public.website_lab_market('recruitment',jsonb_build_object('team_id',tid,'open',true,'description','[ROLLBACK RECRUITMENT] Public opportunity for SQL collaboration.','roles',jsonb_build_array(role_name),'skills',jsonb_build_array('SQL'),'commitment','Three hours weekly'));
 assert exists(select 1 from private_website_lab.market_recruitment where team_id=tid and open and description like '[ROLLBACK RECRUITMENT]%' and roles=array[role_name]),'Recruitment settings not saved';
 r:=public.website_lab_market('projects',jsonb_build_object('q','[ROLLBACK RECRUITMENT]'));assert exists(select 1 from jsonb_array_elements(r->'rows')x where x->>'team_id'=tid::text and x->>'available'='2'),'Open listing absent from existing discovery';
 insert into recruitment_results values('Approved capacity saves and is retrieved accurately; valid recruitment publishes with the correct available places',true);
 perform set_config('request.jwt.claim.sub',joiner::text,true);
 denied:=false;begin perform public.website_lab_market('manage',jsonb_build_object('team_id',tid));exception when insufficient_privilege then denied:=true;end;assert denied,'Unauthorised member read management';
 denied:=false;begin perform public.website_lab_market('recruitment',jsonb_build_object('team_id',tid,'open',true,'description','Unauthorised public recruitment attempt with valid fields.','roles',jsonb_build_array(role_name),'commitment','Weekly'));exception when insufficient_privilege then denied:=true;end;assert denied,'Unauthorised member changed recruitment';
 req:=(public.website_lab_market('request',jsonb_build_object('team_id',tid,'role',role_name,'proposal','Synthetic collaboration request for the public role.','commitment','Weekly'))->>'request_id')::uuid;
 perform set_config('request.jwt.claim.sub',owner::text,true);perform public.website_lab_market('accept',jsonb_build_object('request_id',req));
 perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab_market('capacity',jsonb_build_object('team_id',tid,'capacity',1));
 perform set_config('request.jwt.claim.sub',owner::text,true);r:=public.website_lab_market('manage',jsonb_build_object('team_id',tid));assert r->>'occupied'='1' and r->'recruitment'->>'collaborator_capacity'='1','Occupied capacity incorrect';
 r:=public.website_lab_market('projects',jsonb_build_object('q','[ROLLBACK RECRUITMENT]'));assert not exists(select 1 from jsonb_array_elements(r->'rows')x where x->>'team_id'=tid::text),'Full listing remained discoverable';
 perform public.website_lab_market('recruitment',jsonb_build_object('team_id',tid,'open',false,'description','[ROLLBACK RECRUITMENT] Updated and closed public summary.','roles',jsonb_build_array(role_name),'skills','[]'::jsonb,'commitment','Weekly'));
 assert exists(select 1 from private_website_lab.market_recruitment where team_id=tid and not open),'Full listing could not close';
 insert into recruitment_results values('Unauthorised management is denied; existing requests admit normally; full capacity hides discovery but still permits closing',true);

 -- A member already confirmed in one Lab must not get a second current Lab for the same project.
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(other_owner,'recruitment-rollback-'||other_owner||'@example.invalid',now(),'{"full_name":"Recruitment rollback fixture"}');
 other_tid:=pg_temp.fixture_offer(staff,other_owner,ref);
 perform set_config('request.jwt.claim.sub',other_owner::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',other_tid,'response','accept','commitment_confirmed','true'));
 perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',other_tid,'user_id',other_owner,'reason','Synthetic second Lab access verification'));perform public.website_lab_market('capacity',jsonb_build_object('team_id',other_tid,'capacity',2));
 perform set_config('request.jwt.claim.sub',other_owner::text,true);perform public.website_lab_market('recruitment',jsonb_build_object('team_id',other_tid,'open',true,'description','[ROLLBACK RECRUITMENT] Another Lab for the same project.','roles',jsonb_build_array(role_name),'commitment','Weekly'));
 perform set_config('request.jwt.claim.sub',joiner::text,true);
 perform public.website_lab_market('preferences',jsonb_build_object('discoverable',true,'contactable',true));
 denied:=false;begin perform public.website_lab_market('request',jsonb_build_object('team_id',other_tid,'role',role_name,'proposal','Synthetic duplicate project request should be rejected.','commitment','Weekly'));exception when raise_exception then assert sqlerrm like '%only one current Lab placement per project%','Wrong project conflict error';denied:=true;end;assert denied,'Duplicate project request created';
 perform set_config('request.jwt.claim.sub',other_owner::text,true);
 denied:=false;begin perform public.website_lab_market('invite',jsonb_build_object('team_id',other_tid,'member_id',joiner,'role',role_name,'proposal','Synthetic duplicate project invitation should be rejected.','commitment','Weekly'));exception when raise_exception then denied:=true;end;assert denied,'Duplicate project invitation created';
 -- Simulate an older request created before the member received their current place.
 insert into private_website_lab.market_requests(team_id,member_id,kind,initiated_by,role,proposal,commitment) values(other_tid,joiner,'request',joiner,role_name,'Synthetic stale request created before placement.','Weekly') returning id into req;
 r:=public.website_lab_market('inbox');assert exists(select 1 from jsonb_array_elements(r->'rows')x where x->>'id'=req::text and x->>'admission_blocker' like '%only one current Lab%' and x->>'profile_member_id'=joiner::text),'Inbox lacks placement blocker or applicant profile';
 select count(*) into before_count from public.website_project_team_members where user_id=joiner;
 denied:=false;begin perform public.website_lab_market('accept',jsonb_build_object('request_id',req));exception when raise_exception then assert sqlerrm like '%only one current Lab placement per project%';denied:=true;end;assert denied,'Stale duplicate project request admitted';
 assert (select state='pending' from private_website_lab.market_requests where id=req),'Failed admission changed request';assert (select count(*)=before_count from public.website_project_team_members where user_id=joiner),'Failed admission changed memberships';
 insert into recruitment_results values('Same-project requests and stale acceptance are blocked explicitly without partial writes; authorised inbox includes profile review and the reason',true);
end $test$;
select * from recruitment_results;rollback;
