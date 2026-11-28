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
create temp table discovery_results(check_name text,passed boolean);
do $test$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();staff uuid;refs text[];tid uuid;other_team uuid;role_name text;result jsonb;second jsonb;pid uuid;conv uuid;started timestamptz;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select array_agg(project_ref order by project_ref) into refs from(select project_ref from public.website_project_briefs order by project_ref limit 4)x;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) select x,'discovery-'||x||'@example.invalid',now(),jsonb_build_object('full_name','Synthetic discovery member '||x) from unnest(array[a,b])x;
 update public.profiles set skills='SQL, Python',bio='Synthetic background shared only by explicit consent.',location='SyntheticLocationSecret',professional_area='Analytics',experience_level='Experienced' where id=a;
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.website_lab_market('preferences','{"discoverable":true,"contactable":true}');
 perform set_config('request.jwt.claim.sub',b::text,true);result:=public.website_market_discovery('profile',jsonb_build_object('member_id',a));
 if result->>'bio' is not null or result->>'location' is not null or jsonb_array_length(result->'skills')<>2 then raise exception 'Profile privacy or skill projection incorrect: %',result;end if;
 result:=public.website_lab_market('people',jsonb_build_object('q','SyntheticLocationSecret'));if result->>'total'<>'0' then raise exception 'Search leaked unshared location';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.website_lab_market('preferences','{"discoverable":true,"contactable":true,"share_details":true,"notify_community":false,"notify_messages":false}');
 perform set_config('request.jwt.claim.sub',b::text,true);result:=public.website_market_discovery('profile',jsonb_build_object('member_id',a));
 if result->>'bio' is null or result->>'location' is not null then raise exception 'Separate details/location consent ignored';end if;
 result:=public.website_lab_market('people',jsonb_build_object('area','Analytics'));if result->>'total'<>'1' or jsonb_array_length(result->'rows'->0->'skills')<>2 then raise exception 'Shared professional filter or populated skill array failed';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.website_lab_market('preferences','{"discoverable":true,"contactable":true,"share_details":true,"share_location":true,"notify_community":false,"notify_messages":false}');
 perform set_config('request.jwt.claim.sub',b::text,true);result:=public.website_lab_market('people',jsonb_build_object('q','SyntheticLocationSecret'));if result->>'total'<>'1' then raise exception 'Shared location could not be searched';end if;
 insert into discovery_results values('populated skills render as arrays; profile background/location consent and shared-field search filters are separate',true);
 -- Activate a real official Solo formation, then inspect only its explicit public listing.
 tid:=pg_temp.fixture_offer(staff,a,refs[1]);
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));
 perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',a,'reason','Synthetic public discovery activation access check'));perform public.website_lab_market('capacity',jsonb_build_object('team_id',tid,'capacity',1));
 select roles->>0 into role_name from public.website_project_briefs where project_ref=refs[1];
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.website_lab_market('recruitment',jsonb_build_object('team_id',tid,'open',true,'description','Explicitly published synthetic recruitment summary.','commitment','Two hours weekly','roles',jsonb_build_array(role_name),'skills',jsonb_build_array('SQL')));
 perform public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','resource','title','PRIVATE FIXTURE MUST NOT BE PUBLISHED','url','https://www.ons.gov.uk/'));
 perform set_config('request.jwt.claim.sub',b::text,true);perform public.website_market_discovery('follow_project',jsonb_build_object('project_ref',refs[1],'enabled',true));
 perform set_config('request.jwt.claim.sub',a::text,true);pid:=(public.website_lab_community('publish',jsonb_build_object('kind','update','team_id',tid,'body','A deliberately shared public progress highlight.','client_nonce',gen_random_uuid()))->>'post_id')::uuid;
 perform set_config('request.jwt.claim.sub',b::text,true);result:=public.website_market_discovery('project',jsonb_build_object('team_id',tid));
 if jsonb_array_length(result->'highlights')<>1 or result::text like '%PRIVATE FIXTURE%' or result?'members' or result?'items' or result->>'following'<>'true' then raise exception 'Public project isolation failed';end if;
 result:=public.website_lab_community('feed','{"view":"following"}');if not exists(select 1 from jsonb_array_elements(result->'rows')x where x->>'id'=pid::text) then raise exception 'Following omitted public project update';end if;
 if not exists(select 1 from private_website_lab.notifications where recipient_id=b and event_key='market-followed-post:'||pid) then raise exception 'Project follower notification missing';end if;
 perform public.website_lab_community('comment',jsonb_build_object('post_id',pid,'body','A useful public progress question.','client_nonce',gen_random_uuid()));
 if exists(select 1 from private_website_lab.notifications where recipient_id=a and event_key like 'market-comment:%') then raise exception 'Community notification opt-out ignored';end if;
 perform private_website_lab.notify_member(a,'market-request:synthetic-important','Important collaboration decision','/member/market?tab=requests');
 if not exists(select 1 from private_website_lab.notifications where recipient_id=a and event_key='market-request:synthetic-important') then raise exception 'Preference disabled required governance notifications';end if;
 insert into discovery_results values('project details expose explicit public highlights only; project follows feed and notify without copying private Lab work',true);
 -- At the three-Lab allowance a member retains community, discovery and messaging.
 for idx in 2..4 loop
  other_team:=pg_temp.fixture_offer(staff,b,refs[idx]);perform set_config('request.jwt.claim.sub',b::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',other_team,'response','accept','commitment_confirmed','true'));perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',other_team,'user_id',b,'reason','Synthetic three-slot community access regression'));
 end loop;
 perform set_config('request.jwt.claim.sub',b::text,true);if private_website_lab.participation_usage(b)->>'used'<>'3' then raise exception 'At-limit fixture incomplete';end if;
 perform public.website_lab_community('publish',jsonb_build_object('kind','question','body','A community question from a member in three Labs.','client_nonce',gen_random_uuid()));
 perform public.website_lab_market('people');
 conv:=(public.website_lab_community('message_request',jsonb_build_object('member_id',a,'body','An allowed message request at the participation limit.','client_nonce',gen_random_uuid()))->>'conversation_id')::uuid;
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.website_lab_community('message_decision',jsonb_build_object('conversation_id',conv,'enabled',true));
 perform set_config('request.jwt.claim.sub',b::text,true);perform public.website_lab_community('message',jsonb_build_object('conversation_id',conv,'body','Continued permitted conversation at three Lab slots.','client_nonce',gen_random_uuid()));
 if exists(select 1 from private_website_lab.notifications where recipient_id=a and event_key like 'market-dm:%') then raise exception 'Message notification opt-out ignored';end if;
 insert into discovery_results values('members using all three Labs can publish, discover and exchange accepted messages; notification preferences preserve required decisions',true);
 -- 1,001 opt-in people exercise the real profile storage shape and 25-row pages.
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) select gen_random_uuid(),'market-scale-'||gen_random_uuid()||'@example.invalid',now(),jsonb_build_object('full_name','SyntheticScalePerson '||lpad(g::text,4,'0')) from generate_series(1,1001)g;
 insert into private_website_lab.market_preferences(user_id,discoverable) select id,true from auth.users where email like 'market-scale-%@example.invalid';
 started:=clock_timestamp();result:=public.website_lab_market('people','{"q":"SyntheticScalePerson","page":1}');second:=public.website_lab_market('people','{"q":"SyntheticScalePerson","page":2}');
 if result->>'total'<>'1001' or jsonb_array_length(result->'rows')<>25 or jsonb_array_length(second->'rows')<>25 or exists(select 1 from jsonb_array_elements(result->'rows')x join jsonb_array_elements(second->'rows')y on x->>'id'=y->>'id') then raise exception 'Populated member directory pagination failed';end if;
 insert into discovery_results values('1,001 discoverable profiles return distinct stable pages of 25; two reads took '||round(extract(epoch from clock_timestamp()-started)*1000)||' ms',true);
end $test$;
select * from discovery_results;
rollback;
