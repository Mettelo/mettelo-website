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
do $test$
#variable_conflict use_variable
declare staff uuid;standard_uid uuid:=gen_random_uuid();uid uuid:=gen_random_uuid();refs text[];tid uuid;t1 uuid;t2 uuid;t3 uuid;usage jsonb;denied boolean;k integer;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select array_agg(project_ref order by project_ref) into refs from (select b.project_ref from public.website_project_briefs b join public.website_project_pilot_settings s using(project_ref) where jsonb_array_length(b.roles)>0 and (select count(*) from public.website_project_teams t where t.project_ref=b.project_ref and t.status='active')<s.max_active_teams order by b.project_ref limit 4) x;
 if cardinality(refs)<>4 then raise exception 'Four fixture projects required';end if;
 if private_website_lab.participation_allowance(standard_uid)<>3 then raise exception 'Expected approved default of three';end if;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(standard_uid,'participation-'||standard_uid||'@example.invalid',now(),'{"full_name":"Synthetic standard allowance member"}');
 for k in 1..3 loop
  tid:=pg_temp.fixture_offer(staff,standard_uid,refs[k]);
  perform set_config('request.jwt.claim.sub',standard_uid::text,true);
  perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));
  perform set_config('request.jwt.claim.sub',staff::text,true);
  perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',standard_uid,'reason','Synthetic three-Lab policy verification only'));
 end loop;
 if private_website_lab.participation_usage(standard_uid)->>'active'<>'3' then raise exception 'Three Labs did not activate';end if;
 denied:=false;begin perform pg_temp.fixture_offer(staff,standard_uid,refs[4]);exception when raise_exception then if sqlerrm not like 'Lab participation limit reached%' then raise;end if;denied:=true;end;
 if not denied then raise exception 'Fourth official Lab allowed';end if;
 insert into participation_results values('approved default permits three active Labs and blocks a fourth official placement',true);
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'participation-'||uid||'@example.invalid',now(),'{"full_name":"Synthetic participation member"}');
 insert into private_website_lab.participation_entitlements(user_id,lab_allowance,reason) values(uid,2,'Synthetic lower allowance lifecycle verification');
 for k in 1..2 loop
  tid:=pg_temp.fixture_offer(staff,uid,refs[k]);if k=1 then t1:=tid;else t2:=tid;end if;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));
  perform set_config('request.jwt.claim.sub',staff::text,true);
  perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',uid,'reason','Synthetic access verification for rollback fixture'));
 end loop;
 if (select count(*) from public.website_project_teams where id in(t1,t2) and status='active')<>2 then raise exception 'Fixture Labs not active';end if;
 denied:=false;begin perform pg_temp.fixture_offer(staff,uid,refs[3]);exception when raise_exception then if sqlerrm not like 'Lab participation limit reached%' then raise;end if;denied:=true;end;
 if not denied then raise exception 'Third official Lab allowed';end if;
 insert into participation_results values('two active Labs block a third official offer before acceptance',true);
 update public.website_project_teams set status='paused' where id=t1;
 usage:=private_website_lab.participation_usage(uid);
 if usage->>'used'<>'2' or usage->>'paused'<>'1' then raise exception 'Paused Lab lost slot';end if;
 denied:=false;begin perform pg_temp.fixture_offer(staff,uid,refs[3]);exception when raise_exception then if sqlerrm not like 'Lab participation limit reached%' then raise;end if;denied:=true;end;if not denied then raise exception 'Pause bypassed allowance';end if;
 insert into participation_results values('paused Labs retain their participation slot',true);
 update public.website_project_teams set status='completed' where id=t1;
 if private_website_lab.participation_usage(uid)->>'used'<>'1' then raise exception 'Completed Lab consumes slot';end if;
 t3:=pg_temp.fixture_offer(staff,uid,refs[3]);
 usage:=private_website_lab.participation_usage(uid);if usage->>'used'<>'2' or usage->>'reserved'<>'1' then raise exception 'Unexpired offer not reserved';end if;
 update public.website_project_team_members set offer_expires_at=now()-interval '1 hour' where team_id=t3;
 if private_website_lab.participation_usage(uid)->>'used'<>'1' then raise exception 'Expired offer consumes slot';end if;
 update public.website_project_team_members set status='declined' where team_id=t3;
 if private_website_lab.participation_usage(uid)->>'used'<>'1' then raise exception 'Declined offer consumes slot';end if;
 insert into participation_results values('completed Labs, expired and declined offers release slots; live offers reserve them',true);
 -- Use the actual audited release path; repository access was previously verified.
 perform set_config('request.jwt.claim.sub',staff::text,true);
 perform public.website_lab('release_member',jsonb_build_object('team_id',t2,'user_id',uid,'release_reason','other','reason','Synthetic release with external revocation still pending'));
 usage:=private_website_lab.participation_usage(uid);
 if usage->>'revoking'<>'1' or usage->>'used'<>'1' then raise exception 'Release freed a slot before external revocation';end if;
 if exists(select 1 from public.website_project_team_members where team_id=t2 and (status<>'left' or admitted_at is not null)) then raise exception 'In-platform access not revoked';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 denied:=false;begin perform public.website_lab('workspace',jsonb_build_object('team_id',t2));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Departed member retained workspace access';end if;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 perform public.website_lab('external_access_review',jsonb_build_object('team_id',t2,'user_id',uid,'external_access_confirmed','true'));
 if private_website_lab.participation_usage(uid)->>'used'<>'0' then raise exception 'Completed revocation did not free slot';end if;
 insert into participation_results values('departure revokes Lab access immediately but frees slot only after external revocation is confirmed',true);
 -- Configurable policy affects eligibility, never project authority.
 insert into private_website_lab.participation_entitlements(user_id,lab_allowance,reason) values(uid,0,'Synthetic zero-allowance policy check') on conflict(user_id) do update set lab_allowance=0;
 denied:=false;begin perform pg_temp.fixture_offer(staff,uid,refs[4]);exception when raise_exception then if sqlerrm not like 'Lab participation limit reached%' then raise;end if;denied:=true;end;if not denied then raise exception 'Zero allowance ignored';end if;
 update private_website_lab.participation_entitlements set lab_allowance=4 where user_id=uid;
 tid:=pg_temp.fixture_offer(staff,uid,refs[4]);
 perform set_config('request.jwt.claim.sub',uid::text,true);
 denied:=false;begin perform public.website_lab('form_group','{}');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Entitlement granted administrator authority';end if;
 usage:=public.website_lab('participation_usage');if usage->>'allowance'<>'4' then raise exception 'Allowance resolver not used';end if;
 update private_website_lab.participation_entitlements set valid_until=now()-interval '1 hour' where user_id=uid;
 if private_website_lab.participation_allowance(uid)<>3 then raise exception 'Expired entitlement did not return to policy';end if;
 if has_table_privilege('authenticated','private_website_lab.participation_entitlements','UPDATE') or has_function_privilege('authenticated','private_website_lab.assert_participation_slot(uuid,uuid)','EXECUTE') then raise exception 'Private policy authority exposed';end if;
 insert into participation_results values('configurable and expiring allowances preserve role authorization and private policy grants',true);
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;begin perform public.website_lab('participation_usage');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Anonymous usage available';end if;
 insert into participation_results values('usage is scoped to the verified current member',true);
end $test$;
select * from participation_results;
rollback;
