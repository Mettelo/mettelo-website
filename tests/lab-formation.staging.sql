-- Synthetic fixtures only. Run after formation migration; every test record rolls back.
begin;
do $test$
#variable_conflict use_variable
declare admin_id uuid; ids uuid[]:='{}'; apps uuid[]:='{}'; uid uuid; iid uuid; team_id uuid; solo_id uuid; pair_id uuid; bad uuid; k integer; rejected boolean; payload jsonb; result jsonb; count_before integer;
begin
 select user_id into admin_id from private_website_lab.admins limit 1;
 if admin_id is null then raise exception 'Project administrator missing';end if;
 for k in 1..5 loop
  uid:=gen_random_uuid();insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'formation-fixture-'||uid||'@example.invalid',now(),'{"full_name":"Synthetic formation member"}');
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version)
   values(uid,'MTL-DA-001',case when k in (4,5) then 'flexible' else 'team' end,'Data Analyst',repeat('fixture ',5),repeat('fixture ',8),jsonb_build_object('commitment_response','yes','coordination_preference',case when k=1 then 'comfortable' else 'contributor' end),'2026-09-03-v1') returning id into iid;
  ids:=array_append(ids,uid);apps:=array_append(apps,iid);
 end loop;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 rejected:=false;begin perform public.website_lab('formation_list');exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Member read admin review data';end if;
 if has_function_privilege('authenticated','private_website_lab.control(text,jsonb)','EXECUTE') then raise exception 'Legacy control bypass remains executable';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 for k in 1..5 loop perform public.website_lab('review_interest',jsonb_build_object('interest_id',apps[k],'review_status','shortlisted'));end loop;
 result:=public.website_lab('formation_list');if result->>'workflow_version'<>'2' then raise exception 'Workflow version missing';end if;
 if not exists(select 1 from jsonb_array_elements(result->'interests') x where x->>'id'=apps[1]::text and x->>'review_status'='shortlisted') then raise exception 'Review state not persisted';end if;
 payload:=jsonb_build_object('project_ref','MTL-DA-001','label','[ROLLBACK] Formation A','participation','team','compatibility_reviewed','true','nominee_id',ids[1],'required_roles',jsonb_build_array('Data Analyst'),'members',jsonb_build_array(jsonb_build_object('interest_id',apps[1],'role','Data Analyst'),jsonb_build_object('interest_id',apps[2],'role','Data Analyst'),jsonb_build_object('interest_id',apps[3],'role','Data Analyst')));
 rejected:=false;begin perform public.website_lab('form_group',payload||jsonb_build_object('members',jsonb_build_array(jsonb_build_object('interest_id',apps[1],'role','Data Analyst'),jsonb_build_object('interest_id',apps[2],'role','Data Analyst'))));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Normal two-person group was formed';end if;
 select count(*) into count_before from public.website_project_teams;
 rejected:=false;begin perform public.website_lab('form_group',payload||jsonb_build_object('nominee_id',ids[3]));exception when raise_exception then rejected:=true;end;
 if not rejected or (select count(*) from public.website_project_teams)<>count_before then raise exception 'Invalid nominee created a partial team';end if;
 team_id:=(public.website_lab('form_group',payload)->>'team_id')::uuid;
 result:=public.website_lab('formation_list');
 if not exists(select 1 from jsonb_array_elements(result->'teams') x where x->>'id'=team_id::text and x->'readiness'->>'ready'='false') then raise exception 'Admin readiness projection missing';end if;
 if (select count(*) from public.website_project_team_members where website_project_team_members.team_id=team_id and status='offered')<>3 then raise exception 'Combined offers were not saved';end if;
 rejected:=false;begin perform public.website_lab('form_group',payload||jsonb_build_object('label','[ROLLBACK] Duplicate reservation'));exception when raise_exception then rejected:=true;end;
 if not rejected or (select count(*) from public.website_project_teams)<>count_before+1 then raise exception 'Duplicate allocation created a partial team';end if;
 rejected:=false;begin perform public.website_lab('start',jsonb_build_object('team_id',team_id));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Started a team before acceptance';end if;
 for k in 1..3 loop
  perform set_config('request.jwt.claim.sub',ids[k]::text,true);
  rejected:=false;begin perform public.website_lab('respond',jsonb_build_object('team_id',team_id,'response','accept'));exception when raise_exception then rejected:=true;end;
  if not rejected then raise exception 'Accepted without explicit commitment';end if;
  perform public.website_lab('respond',jsonb_build_object('team_id',team_id,'response','accept','commitment_confirmed','true'));
 end loop;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 rejected:=false;begin perform public.website_lab('agree_coordinator',jsonb_build_object('team_id',team_id));
 result:=public.website_lab('mine');if not exists(select 1 from jsonb_array_elements(result) x where x->>'team_id'=team_id::text and x->>'is_nominee'='true' and x->>'coordinator_agreed'='true') then raise exception 'Member agreement projection missing';end if;exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Non-nominee took coordinator authority';end if;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);perform public.website_lab('agree_coordinator',jsonb_build_object('team_id',team_id));
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 for k in 1..3 loop perform public.website_lab('verify_access',jsonb_build_object('team_id',team_id,'user_id',ids[k],'reason','Synthetic access check only'));end loop;
 perform public.website_lab('prepare_workspace',jsonb_build_object('team_id',team_id));
 result:=private_website_lab.readiness(team_id);if result->>'ready'<>'true' then raise exception 'Prepared team not ready: %',result;end if;
 perform public.website_lab('start',jsonb_build_object('team_id',team_id));
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 perform public.website_lab('discussion',jsonb_build_object('team_id',team_id,'project_ref','MTL-DA-001','body','Synthetic newly formed team chat works.','client_nonce',gen_random_uuid()));
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 -- Flexible can receive a solo offer, but cannot be allocated again on this project.
 solo_id:=(public.website_lab('form_group',jsonb_build_object('project_ref','MTL-DA-001','label','[ROLLBACK] Flexible Solo','participation','solo','compatibility_reviewed','true','members',jsonb_build_array(jsonb_build_object('interest_id',apps[4],'role','Data Analyst'))))->>'team_id')::uuid;
 perform set_config('request.jwt.claim.sub',ids[4]::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',solo_id,'response','accept','commitment_confirmed','true'));
 if (select coordinator_id from public.website_project_teams where id=solo_id)<>ids[4] then raise exception 'Solo delivery authority not assigned to owner';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',solo_id,'user_id',ids[4],'reason','Synthetic solo repository access'));perform public.website_lab('prepare_workspace',jsonb_build_object('team_id',solo_id));perform public.website_lab('start',jsonb_build_object('team_id',solo_id));
 -- Removing an active member pauses the team and revokes workspace access without deleting work.
 perform public.website_lab('release_member',jsonb_build_object('team_id',team_id,'user_id',ids[2],'reason','Synthetic member withdrawal request','release_reason','inactive'));
 if (select status from public.website_project_teams where id=team_id)<>'paused' then raise exception 'Active team did not pause after removal';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);rejected:=false;begin perform public.website_lab('workspace',jsonb_build_object('team_id',team_id));exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Released member retained Lab access';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 if not exists(select 1 from private_website_lab.items where private_website_lab.items.team_id=team_id and kind='message') then raise exception 'Removal deleted prior team work';end if;
 -- Offer and explicit expiry, including refusal to accept a stale offer.
 perform public.website_lab('offer',jsonb_build_object('team_id',team_id,'interest_id',apps[5],'role','Data Analyst'));
 rejected:=false;begin perform public.website_lab('expire_offer',jsonb_build_object('team_id',team_id,'user_id',ids[5],'reason','Must not expire a fresh offer'));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Fresh offer expired';end if;
 update public.website_project_team_members set offer_expires_at=now()-interval '1 minute' where website_project_team_members.team_id=team_id and user_id=ids[5];
 perform set_config('request.jwt.claim.sub',ids[5]::text,true);rejected:=false;begin perform public.website_lab('respond',jsonb_build_object('team_id',team_id,'response','accept','commitment_confirmed','true'));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Expired offer accepted';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);perform public.website_lab('expire_offer',jsonb_build_object('team_id',team_id,'user_id',ids[5],'reason','Synthetic expired offer cleanup'));
 if exists(select 1 from public.website_project_team_members where website_project_team_members.team_id=team_id and user_id=ids[5] and status in ('offered','confirmed')) then raise exception 'Expired offer retained reservation';end if;

 -- A separately approved two-person team requires both explicit consents.
 payload:=jsonb_build_object('project_ref','MTL-DA-001','label','[ROLLBACK] Two person exception','participation','team','compatibility_reviewed','true','nominee_id',ids[2],'two_person_exception','true','reason','A deliberately limited pilot with support.','members',jsonb_build_array(jsonb_build_object('interest_id',apps[2],'role','Data Analyst'),jsonb_build_object('interest_id',apps[5],'role','Data Analyst')));
 update public.website_project_interests set answers=answers||'{"coordination_preference":"interested_with_support"}'::jsonb where id=apps[2];
 pair_id:=(public.website_lab('form_group',payload)->>'team_id')::uuid;
 for k in 1..2 loop
  uid:=case when k=1 then ids[2] else ids[5] end;
  perform set_config('request.jwt.claim.sub',uid::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',pair_id,'response','accept','commitment_confirmed','true'));
 end loop;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);perform public.website_lab('agree_coordinator',jsonb_build_object('team_id',pair_id));
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform public.website_lab('verify_access',jsonb_build_object('team_id',pair_id,'user_id',ids[2],'reason','Synthetic pair repository access'));perform public.website_lab('verify_access',jsonb_build_object('team_id',pair_id,'user_id',ids[5],'reason','Synthetic pair repository access'));perform public.website_lab('prepare_workspace',jsonb_build_object('team_id',pair_id));
 rejected:=false;begin perform public.website_lab('start',jsonb_build_object('team_id',pair_id));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Pair started without explicit consent';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);perform public.website_lab('agree_two',jsonb_build_object('team_id',pair_id));
 perform set_config('request.jwt.claim.sub',ids[5]::text,true);perform public.website_lab('agree_two',jsonb_build_object('team_id',pair_id));
 perform set_config('request.jwt.claim.sub',admin_id::text,true);perform public.website_lab('start',jsonb_build_object('team_id',pair_id));
 perform public.website_lab('placement_status',jsonb_build_object('team_id',pair_id,'status','completed','reason','Synthetic delivery completed for test'));
 perform set_config('request.jwt.claim.sub',ids[5]::text,true);rejected:=false;begin perform public.website_lab('discussion',jsonb_build_object('team_id',pair_id,'project_ref','MTL-DA-001','body','Must not write into a completed Lab.','client_nonce',gen_random_uuid()));exception when raise_exception or insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Completed placement remained writable';end if;

end $test$;
-- Exercise the real authenticated wrapper, rather than only owner-role impersonation.
select set_config('formation.test_admin',(select user_id::text from private_website_lab.admins limit 1),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('formation.test_admin'),true);
select public.website_lab('formation_list');
do $permissions$
begin
 begin
  perform 1 from private_website_lab.interest_reviews;
  raise exception 'Authenticated role can directly read private review notes';
 exception when insufficient_privilege then null;end;
 begin
  perform private_website_lab.control('list','{}');
  raise exception 'Authenticated role can bypass admission through legacy control';
 exception when insufficient_privilege then null;end;
end $permissions$;
reset role;
rollback;
