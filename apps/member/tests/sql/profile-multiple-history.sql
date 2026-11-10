begin;
create temp table history_test_result(check_name text,passed boolean);
do $test$
declare uid uuid:=gen_random_uuid();other_uid uuid:=gen_random_uuid();v bigint;profile public.profiles;education jsonb;experience jsonb;bad jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'history-rollback-'||uid||'@example.invalid',now(),'{"full_name":"History fixture"}'),(other_uid,'history-rollback-'||other_uid||'@example.invalid',now(),'{"full_name":"Other fixture"}');
 perform set_config('request.jwt.claim.sub',uid::text,true);
 select profile_version into v from public.profiles where id=uid;
 education:=jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'qualification',' BSc ','institution','Fixture College','subject','Computing','period','2018–2022','description','First degree'),jsonb_build_object('id',gen_random_uuid(),'qualification','MSc','institution','Fixture University','subject','Data Science','period','2023–2024','description','Second degree'));
 experience:=jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'title','Analyst','organisation','Fixture Employer','location','Remote','period','2022–2023','description','Delivered reporting'),jsonb_build_object('id',gen_random_uuid(),'title','Volunteer developer','organisation','Fixture Project','location','Remote','period','2024–present','description','Community contribution'));
 profile:=public.save_website_profile(jsonb_build_object('education_entries',education,'experience_entries',experience),v,false);
 if jsonb_array_length(profile.education_entries)<>2 or jsonb_array_length(profile.experience_entries)<>2 or profile.education_entries->0->>'qualification'<>'BSc' then raise exception 'Multiple entries or normalisation failed';end if;
 v:=profile.profile_version;
 education:=jsonb_set(profile.education_entries,'{1,qualification}','"MSc (updated)"');
 profile:=public.save_website_profile(jsonb_build_object('education_entries',education),v,false);
 if profile.education_entries->1->>'qualification'<>'MSc (updated)' or jsonb_array_length(profile.experience_entries)<>2 then raise exception 'Editing education changed experience';end if;
 begin perform public.save_website_profile(jsonb_build_object('education_entries',education),v,false);raise exception 'Stale history save accepted';exception when serialization_failure then null;end;
 v:=profile.profile_version;
 profile:=public.save_website_profile(jsonb_build_object('education_entries',jsonb_build_array(profile.education_entries->1)),v,false);
 if jsonb_array_length(profile.education_entries)<>1 or jsonb_array_length(profile.experience_entries)<>2 then raise exception 'Removal changed another collection';end if;
 v:=profile.profile_version;
 foreach bad in array array['{}'::jsonb,'[{}]'::jsonb,'[{"title":123}]'::jsonb,'[{"id":"bad","title":"Bad"}]'::jsonb,'[{"title":"Bad","is_verified":"true"}]'::jsonb,jsonb_build_array(jsonb_build_object('title',repeat('x',161))),(select jsonb_agg(jsonb_build_object('title','Entry')) from generate_series(1,21))]
 loop
  begin perform public.save_website_profile(jsonb_build_object('experience_entries',bad),v,false);raise exception 'Invalid history accepted: %',bad;exception when invalid_parameter_value then null;end;
 end loop;
 bad:=jsonb_build_array(jsonb_build_object('id',education->0->>'id','title','First'),jsonb_build_object('id',education->0->>'id','title','Duplicate'));
 begin perform public.save_website_profile(jsonb_build_object('experience_entries',bad),v,false);raise exception 'Duplicate IDs accepted';exception when invalid_parameter_value then null;end;
 if (select profile_version from public.profiles where id=uid)<>v then raise exception 'Invalid history partially saved';end if;
 profile:=public.save_website_profile('{"education_entries":[]}',v,false);
 if jsonb_array_length(profile.education_entries)<>0 or jsonb_array_length(profile.experience_entries)<>2 then raise exception 'Clear not isolated';end if;
 if (select jsonb_array_length(experience_entries) from public.profiles where id=other_uid)<>0 then raise exception 'Other profile changed';end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.save_website_profile('{"experience_entries":[]}',profile.profile_version,false);raise exception 'Unsigned save accepted';exception when insufficient_privilege then null;end;
 insert into history_test_result values('Two education and two experience entries save and trim; edit/remove/clear preserve the other collection',true),('Stale writes, invalid types/fields, duplicate IDs and excessive lengths/counts rejected atomically',true),('Other members remain unchanged; verified identity required; existing optimistic profile version preserved',true);
end $test$;
select * from history_test_result;
rollback;
