-- Isolated staging regression. All project briefs, audit entries and notifications roll back.
begin;
do $$declare staff uuid; outsider uuid:=gen_random_uuid(); payload jsonb; result jsonb; again jsonb; ref text; n integer; denied boolean; begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' and private_website_lab.account_allowed(user_id) limit 1;
 assert staff is not null,'An operations administrator is required';
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(outsider,'publication-qa-'||outsider||'@example.test',now(),'{}');
 payload:=jsonb_build_object('nonce',gen_random_uuid(),'approved_public',true,'title','[PUBLICATION-QA] Public project','problem','A specific problem with an authorised public project scope.','description','A detailed public project description explaining the approach and constraints.','outcome','A measurable and reviewable public project outcome.','category','Data analytics','skills',jsonb_build_array('SQL'),'participation','flexible','commitment','Two hours weekly','milestones','Discovery, prototype and evaluation.','collaboration','Use synthetic data and publish documentation only.','supporting_url','https://github.com/example/publication-qa','roles',jsonb_build_array('Analyst','Engineer'),'member_capacity',4,'max_active_teams',1);
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 denied:=false;begin perform public.website_admin_publish_project(payload);exception when insufficient_privilege then denied:=true;end;assert denied,'An ordinary member published a project';
 perform set_config('request.jwt.claim.sub',staff::text,true);
 denied:=false;begin perform public.website_admin_publish_project(payload||'{"approved_public":false}');exception when raise_exception then denied:=true;end;assert denied,'Publication bypassed public confirmation';
 denied:=false;begin perform public.website_admin_publish_project(payload||'{"supporting_url":"https://name:secret@example.test/repo"}');exception when raise_exception then denied:=true;end;assert denied,'Repository credentials accepted';
 denied:=false;begin perform public.website_admin_publish_project(payload||'{"supporting_url":"javascript:alert(1)"}');exception when raise_exception then denied:=true;end;assert denied,'Unsafe repository accepted';
 select count(*) into n from public.website_project_teams;
 result:=public.website_admin_publish_project(payload);ref:=result->>'project_ref';assert ref ~ '^MTL-MP-[0-9A-F]{12}$','Publication returned no project reference';
 assert exists(select 1 from public.website_project_briefs where project_ref=ref and intake_open and roles ? 'Analyst'),'Brief roles were not registered';
 assert exists(select 1 from public.website_project_pilot_settings where project_ref=ref and member_capacity=4 and max_active_teams=1),'Capacity policy was lost';
 assert (select count(*) from public.website_project_teams)=n,'Publishing automatically formed a Lab';
 again:=public.website_admin_publish_project(payload);assert again->>'project_ref'=ref and again->>'already_published'='true','Retry duplicated publication';
 assert (select count(*) from private_website_lab.project_publications where nonce=(payload->>'nonce')::uuid)=1;
 perform set_config('test.publication.ref',ref,true);
end $$;
set local role anon;
do $$declare r jsonb;begin
 r:=public.website_project_publications(current_setting('test.publication.ref'),1,'');assert (r->>'total')::int=1;
 assert r->'rows'->0->>'repository_url'='https://github.com/example/publication-qa';
 assert not (r->'rows'->0 ?| array['owner_id','published_by','nonce','review_note','reviewed_by']),'Private governance data leaked';
 assert (public.website_project_publications('',999,'[PUBLICATION-QA]')->>'page')::int=1;
 assert (public.website_project_publications('',1,'NoSuchProjectQA')->>'total')::int=0;
 assert not has_function_privilege('anon','public.website_admin_publish_project(jsonb)','EXECUTE');
 assert not has_table_privilege('anon','private_website_lab.project_publications','SELECT');
end $$;
reset role;
select 'Project publication: authority, confirmation, repository validation, roles, capacity, idempotency, search, public projection and no automatic Lab admission passed.' result;
rollback;
