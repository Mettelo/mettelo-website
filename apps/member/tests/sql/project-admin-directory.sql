-- Disposable scale fixtures; no existing record or provider is changed.
begin;
create temp table directory_results(check_name text,passed boolean);
do $test$
#variable_conflict use_variable
declare staff uuid;ordinary uuid:=gen_random_uuid();ref text;tid uuid;iid uuid;candidate_id uuid;candidate_interest uuid;role_name text;a jsonb;b jsonb;d jsonb;one jsonb;denied boolean;k integer;payload jsonb;started timestamptz;seen_ids uuid[];page_ids uuid[];page_no integer;section_name text;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select project_ref,roles->>0 into ref,role_name from public.website_project_briefs order by project_ref limit 1;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(ordinary,'directory-'||ordinary||'@example.invalid',now(),'{"full_name":"Directory Search Member"}');
 insert into public.website_project_teams(project_ref,label,participation,minimum_members,maximum_members,created_at)
 select ref,'[ROLLBACK DIRECTORY] '||lpad(n::text,4,'0'),'team',3,4,now()-interval '1 day'*n from generate_series(1,1000) n;
 create temp table directory_scale_members as select t.id as team_id,gen_random_uuid() as user_id from public.website_project_teams t cross join generate_series(1,3) n where t.label like '[ROLLBACK DIRECTORY]%';
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) select user_id,'directory-scale-'||user_id||'@example.invalid',now(),'{"full_name":"Directory Scale Member"}' from directory_scale_members;
 insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version)
 select user_id,ref,'team',role_name,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes"}','2026-09-03-v1' from directory_scale_members;
 insert into public.website_project_team_members(team_id,interest_id,user_id,project_ref,role,responsibilities,status,offer_expires_at)
 select x.team_id,i.id,x.user_id,ref,role_name,array[role_name],'offered',now()+interval '7 days' from directory_scale_members x join public.website_project_interests i on i.user_id=x.user_id and i.project_ref=ref;
 if (select count(*) from directory_scale_members)<>3000 or
    (select count(*) from public.website_project_team_members m join directory_scale_members x on x.team_id=m.team_id and x.user_id=m.user_id)<>3000 then
  raise exception 'Expected 3000 isolated scale memberships';
 end if;
 insert into directory_results values('1000 populated teams contain exactly 3000 synthetic member records',true);
 perform set_config('request.jwt.claim.sub',staff::text,true);
 started:=clock_timestamp();
 payload:=jsonb_build_object('section','teams','q','[ROLLBACK DIRECTORY]');
 a:=public.website_project_admin_directory('list',payload);b:=public.website_project_admin_directory('list',payload||'{"page":2}'::jsonb);
 if a->>'total'<>'1000' or jsonb_array_length(a->'rows')<>25 or jsonb_array_length(b->'rows')<>25 then raise exception 'Directory did not bound 1000 rows to 25';end if;
 if exists(select 1 from jsonb_array_elements(a->'rows') x join jsonb_array_elements(b->'rows') y on x->>'id'=y->>'id') then raise exception 'Page boundaries overlap';end if;
 if exists(select 1 from jsonb_array_elements(a->'rows') x where x?'members' or x?'readiness') then raise exception 'List leaked expanded team details';end if;
 if public.website_project_admin_directory('list',payload)->'rows'<>a->'rows' then raise exception 'Page order unstable without data changes';end if;
 insert into directory_results values('1000 teams return 25 stable rows per page, without readiness/member expansion',true);
 foreach section_name in array array['teams','attention'] loop
  seen_ids:='{}';
  for page_no in 1..40 loop
   d:=public.website_project_admin_directory('list',payload||jsonb_build_object('section',section_name,'page',page_no));
   select array_agg((x->>'id')::uuid) into page_ids from jsonb_array_elements(d->'rows') x;
   if d->>'total'<>'1000' or cardinality(page_ids)<>25 or seen_ids && page_ids then raise exception 'Missing or duplicate scale page % in %',page_no,section_name;end if;
   seen_ids:=seen_ids||page_ids;
  end loop;
  if cardinality(seen_ids)<>1000 then raise exception 'Incomplete scale traversal';end if;
 end loop;
 a:=public.website_project_admin_directory('list','{"section":"teams","q":"Directory Scale Member"}');
 if a->>'total'<>'1000' then raise exception 'Populated member-name search failed';end if;
 insert into directory_results values('all 40 team and attention pages cover 1000 unique teams; member-name search spans 3000 records',true);
 a:=public.website_project_admin_directory('list',payload||'{"page":999999}'::jsonb);
 if a->>'page'<>'40' or jsonb_array_length(a->'rows')<>25 then raise exception 'Out-of-range page not clamped';end if;
 a:=public.website_project_admin_directory('list',payload||'{"q":"[ROLLBACK DIRECTORY] 0999"}'::jsonb);
 if a->>'total'<>'1' then raise exception 'Team reference search failed';end if;
 tid:=(a->'rows'->0->>'id')::uuid;
 insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(ordinary,ref,'team',role_name,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes"}','2026-09-03-v1') returning id into iid;
 perform public.website_lab('review_interest',jsonb_build_object('interest_id',iid,'review_status','shortlisted'));
 a:=public.website_project_admin_directory('candidates',jsonb_build_object('project',ref,'arrangement','team','q','Directory Search Member'));
 if a->>'total'<>'1' then raise exception 'Shortlisted candidate search failed';end if;
 perform public.website_lab('offer',jsonb_build_object('team_id',tid,'interest_id',iid,'role',role_name));
 a:=public.website_project_admin_directory('list','{"section":"teams","q":"Directory Search Member"}');
 if a->>'total'<>'1' then raise exception 'Member-name team search failed';end if;
 a:=public.website_project_admin_directory('candidates',jsonb_build_object('project',ref,'arrangement','team','q','Directory Search Member'));
 if a->>'total'<>'0' then raise exception 'Allocated applicant still offered as candidate';end if;
 a:=public.website_project_admin_directory('team',jsonb_build_object('team_id',tid));
 if a->'team'->>'id'<>tid::text or jsonb_array_length(a->'team'->'members')<>4 or not(a->'team'?'readiness') then raise exception 'Scoped detail incomplete';end if;
 insert into directory_results values('team/member search, scoped readiness and candidate allocation checks remain correct',true);
 a:=public.website_project_admin_directory('list',jsonb_build_object('section','applications','q','Directory Search Member'));
 if a->>'total'<>'1' or a->'rows'->0?'answers' then raise exception 'Application summary did not stay minimal';end if;
 a:=public.website_project_admin_directory('application',jsonb_build_object('interest_id',iid));
 if a->'interest'->>'id'<>iid::text or not(a->'interest'?'answers') then raise exception 'Application detail missing';end if;
 a:=public.website_project_admin_directory('list','{"section":"attention","q":"[ROLLBACK DIRECTORY]"}');
 if (a->>'total')::integer<>1000 then raise exception 'Attention queue missed unstaffed forming placements';end if;
 if not exists(select 1 from jsonb_array_elements(a->'rows'->0->'actions') x where x#>>'{}'='Confirm coordinator or Solo owner') then raise exception 'Attention has no actionable reason';end if;
 insert into directory_results values('application details load separately; attention reasons are actionable',true);
 insert into public.website_project_teams(project_ref,label,participation,minimum_members,maximum_members,status) values(ref,'[ROLLBACK DIRECTORY] Completed example','team',3,4,'completed');
 a:=public.website_project_admin_directory('list','{"section":"teams","q":"[ROLLBACK DIRECTORY]"}');
 b:=public.website_project_admin_directory('list','{"section":"teams","q":"[ROLLBACK DIRECTORY]","status":"completed"}');
 if a->>'total'<>'1000' or b->>'total'<>'1' then raise exception 'Completed placements were not separated from the live default view';end if;
 if (a->'metrics'->>'applications')::bigint<>(select count(*) from private_website_lab.admin_application_directory where review_status='new') then raise exception 'Summary does not match application review queue';end if;
 insert into directory_results values('completed placements are explicit; summary counts match their review queue',true);
 for k in 1..55 loop
  candidate_id:=gen_random_uuid();
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(candidate_id,'directory-'||candidate_id||'@example.invalid',now(),jsonb_build_object('full_name','Directory Candidate '||lpad(k::text,3,'0')));
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(candidate_id,ref,'flexible',role_name,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes","coordination_preference":"comfortable"}','2026-09-03-v1') returning id into candidate_interest;
  perform public.website_lab('review_interest',jsonb_build_object('interest_id',candidate_interest,'review_status','shortlisted'));
 end loop;
 payload:=jsonb_build_object('project',ref,'arrangement','team','q','Directory Candidate');
 a:=public.website_project_admin_directory('candidates',payload);b:=public.website_project_admin_directory('candidates',payload||'{"page":2}'::jsonb);
 if a->>'total'<>'55' or jsonb_array_length(a->'rows')<>25 or jsonb_array_length(b->'rows')<>25 or exists(select 1 from jsonb_array_elements(a->'rows') x join jsonb_array_elements(b->'rows') y on x->>'id'=y->>'id') then raise exception 'Candidate paging is unbounded or overlapping';end if;
 d:=public.website_project_admin_directory('list',jsonb_build_object('section','applications','q','Directory Candidate','page',3));
 if d->>'total'<>'55' or jsonb_array_length(d->'rows')<>5 then raise exception 'Application paging is incomplete';end if;
 insert into directory_results values('55 applicants/candidates remain bounded to 25 and page boundaries preserve every record',true);
 perform set_config('request.jwt.claim.sub',ordinary::text,true);
 foreach payload in array array['{}'::jsonb,jsonb_build_object('team_id',tid),jsonb_build_object('interest_id',iid)] loop
  denied:=false;begin perform public.website_project_admin_directory(case when payload?'team_id' then 'team' when payload?'interest_id' then 'application' else 'list' end,payload);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Ordinary member read administrator data';end if;
 end loop;
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;begin perform public.website_project_admin_directory('list');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Anonymous directory access allowed';end if;
 if has_table_privilege('authenticated','private_website_lab.admin_team_directory','SELECT') or has_table_privilege('anon','private_website_lab.admin_application_directory','SELECT') then raise exception 'Private read model directly exposed';end if;
 insert into directory_results values('ordinary and anonymous users denied; private read models have no client grants',true);
 raise notice 'Directory scale assertions including fixture writes completed in % ms',extract(epoch from clock_timestamp()-started)*1000;
end $test$;
select * from directory_results;
rollback;
