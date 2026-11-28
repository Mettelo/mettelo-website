-- Synthetic fixture transaction; no email provider is called.
begin;
do $test$
#variable_conflict use_variable
declare admin_id uuid; ids uuid[]:='{}'; apps uuid[]:='{}'; uid uuid; iid uuid; tid uuid; mid uuid; own_meeting uuid; cid uuid; k integer; rejected boolean; result jsonb; payload jsonb; job jsonb;
begin
 select user_id into admin_id from private_website_lab.admins limit 1;
 for k in 1..4 loop
  uid:=gen_random_uuid();insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'lab-operations-'||uid||'@example.invalid',now(),'{"full_name":"Synthetic operations member"}');
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(uid,'MTL-DE-007','team','Data Engineer',repeat('fixture ',5),repeat('fixture ',8),jsonb_build_object('commitment_response','yes','coordination_preference',case when k=1 then 'comfortable' else 'contributor' end),'2026-09-03-v1') returning id into iid;ids:=array_append(ids,uid);apps:=array_append(apps,iid);
 end loop;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 for k in 1..4 loop perform public.website_lab('review_interest',jsonb_build_object('interest_id',apps[k],'review_status','shortlisted'));end loop;
 tid:=(public.website_lab('form_group',jsonb_build_object('project_ref','MTL-DE-007','label','[ROLLBACK] Operations test','participation','team','compatibility_reviewed','true','nominee_id',ids[1],'two_person_exception','true','reason','Small supported pilot for synthetic testing.','members',jsonb_build_array(jsonb_build_object('interest_id',apps[1],'role','Data Engineer'),jsonb_build_object('interest_id',apps[2],'role','Data Engineer'))))->>'team_id')::uuid;
 for k in 1..2 loop perform set_config('request.jwt.claim.sub',ids[k]::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));perform public.website_lab('agree_two',jsonb_build_object('team_id',tid));end loop;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);perform public.website_lab('agree_coordinator',jsonb_build_object('team_id',tid));
 perform set_config('request.jwt.claim.sub',admin_id::text,true);for k in 1..2 loop perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',ids[k],'reason','Synthetic repository verification'));end loop;perform public.website_lab('prepare_workspace',jsonb_build_object('team_id',tid));if (select status from public.website_project_teams where id=tid)<>'active' then raise exception 'Ready fixture Lab did not open automatically';end if;
 if (select count(*) from public.website_project_team_members where team_id=tid and admitted_at is not null)<>2 then raise exception 'Initial start did not admit accepted members';end if;
 payload:=jsonb_build_object('team_id',tid,'client_nonce',gen_random_uuid(),'topic','Synthetic planning meeting','agenda','No real invitations will be sent.','starts_at',now()+interval '2 days','ends_at',now()+interval '2 days 1 hour','time_zone','Europe/London','join_url','https://meet.google.com/abc-defg-hij');
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);own_meeting:=(public.website_lab('meeting_save',payload)->>'meeting_id')::uuid; if (select status from private_website_lab.meetings where id=own_meeting)<>'scheduled' then raise exception 'Team meeting waited for approval';end if;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);mid:=(public.website_lab('meeting_save',payload)->>'meeting_id')::uuid;
 result:=public.website_lab('meeting_save',payload);if result->>'meeting_id'<>mid::text then raise exception 'Retry duplicated a meeting';end if;
 perform private_website_lab.queue_meeting(mid);if (select count(*) from private_website_lab.mail_outbox where meeting_id=mid)<>2 then raise exception 'Wrong or duplicate recipients';end if;
 -- Prioritise this transaction's synthetic queue entries over older unrelated staging jobs.
 update private_website_lab.mail_outbox set created_at=now()-interval '100 years' where meeting_id in (mid,own_meeting);
 job:=public.website_lab_mail_worker('claim');if job->>'skipped'='true' or job is null then raise exception 'Ready email could not be claimed';end if;
 result:=public.website_lab_mail_worker('prepare',jsonb_build_object('job_id',job->>'id','lease_id',job->>'lease_id'));if result->>'email' is null then raise exception 'Worker preparation failed';end if;
 perform public.website_lab_mail_worker('complete',jsonb_build_object('job_id',job->>'id','lease_id',job->>'lease_id','state','failed','error','Synthetic provider failure; no email sent'));
 -- Unknown outcomes require explicit provider reconciliation, never an automatic retry.
 update private_website_lab.mail_outbox set state='unknown' where id=(job->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 rejected:=false;begin perform public.website_lab('outbox_retry',jsonb_build_object('job_id',job->>'id'));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Uncertain email automatically retried';end if;
 perform public.website_lab('outbox_reconcile',jsonb_build_object('job_id',job->>'id','provider_reviewed','true','status','failed','reason','Synthetic provider confirmed no message was sent.'));
 perform public.website_lab('outbox_retry',jsonb_build_object('job_id',job->>'id'));
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 perform public.website_lab('meeting_save',payload||jsonb_build_object('meeting_id',mid,'expected_revision',1,'topic','Updated synthetic planning meeting'));
 rejected:=false;begin perform public.website_lab('meeting_save',payload||jsonb_build_object('meeting_id',mid,'expected_revision',1));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Stale meeting edit overwrote a newer revision';end if;
 if exists(select 1 from private_website_lab.mail_outbox where meeting_id=mid and revision=1 and state in ('pending','failed')) then raise exception 'Stale invitation remained queued after edit';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);perform public.website_lab('offer',jsonb_build_object('team_id',tid,'interest_id',apps[3],'role','Data Engineer'));
 if (select status from public.website_project_teams where id=tid)<>'active' then raise exception 'New offer paused active work';end if;
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));
 rejected:=false;begin perform public.website_lab('workspace',jsonb_build_object('team_id',tid));exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'New member entered without admission';end if;
 rejected:=false;begin perform public.website_lab('meetings',jsonb_build_object('team_id',tid));exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'Onboarding member read meeting links';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',ids[3],'reason','Synthetic growth access check'));
 rejected:=false;begin perform public.website_lab('admit_member',jsonb_build_object('team_id',tid,'user_id',ids[3]));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Admission skipped onboarding';end if;
 perform public.website_lab('admit_member',jsonb_build_object('team_id',tid,'user_id',ids[3],'onboarding_confirmed','true'));
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);
 result:=public.website_lab('meetings',jsonb_build_object('team_id',tid));if result->>'can_schedule'<>'true' then raise exception 'Admitted teammate cannot schedule';end if;
 if exists(select 1 from jsonb_array_elements(result->'meetings') x where x->>'id'=own_meeting::text and x->>'can_manage'='true') then raise exception 'Another contributor received edit controls';end if;
 rejected:=false;begin perform public.website_lab('meeting_save',payload||jsonb_build_object('meeting_id',own_meeting,'expected_revision',1));exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'Contributor edited another organiser meeting';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);perform public.website_lab('meeting_save',payload||jsonb_build_object('meeting_id',own_meeting,'expected_revision',1,'topic','Updated by its actual organiser'));perform public.website_lab('meeting_cancel',jsonb_build_object('team_id',tid,'meeting_id',own_meeting,'expected_revision',2));
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 result:=private_website_lab.readiness(tid);if result->>'ready'<>'true' then raise exception 'Third member incorrectly required two-person agreement: %',result;end if;
 if (select count(*) from private_website_lab.mail_outbox where meeting_id=mid and user_id=ids[3])<>1 then raise exception 'Admitted member missing future invitation';end if;
 perform public.website_lab('meeting_cancel',jsonb_build_object('team_id',tid,'meeting_id',mid,'expected_revision',2));
 if (select count(*) from private_website_lab.mail_outbox where meeting_id=mid and revision=3 and kind='cancelled')<>3 then raise exception 'Cancellation notices missing active members';end if;
 perform public.website_lab('offer',jsonb_build_object('team_id',tid,'interest_id',apps[4],'role','Data Engineer'));perform public.website_lab('release_member',jsonb_build_object('team_id',tid,'user_id',ids[4],'release_reason','other','reason','Synthetic pending offer cancellation'));
 if (select status from public.website_project_teams where id=tid)<>'active' then raise exception 'Cancelling pending offer paused delivery';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);cid:=(public.website_lab('support_create',jsonb_build_object('team_id',tid,'category','conduct','subject','Synthetic private concern','description','Synthetic private report for access checks; not a real allegation.'))->>'case_id')::uuid;
 if (select status from public.website_project_team_members where team_id=tid and user_id=ids[1])<>'confirmed' then raise exception 'Enquiry changed a placement automatically';end if;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);rejected:=false;begin perform public.website_lab('support_case',jsonb_build_object('case_id',cid));exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'Coordinator read private report';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);perform public.website_lab('support_reply',jsonb_build_object('case_id',cid,'body','Internal synthetic administrator note.','internal','true'));perform public.website_lab('support_reply',jsonb_build_object('case_id',cid,'body','Reporter-visible synthetic reply.'));
 perform public.website_lab('support_update',jsonb_build_object('case_id',cid,'status','waiting_for_member'));
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);perform public.website_lab('support_reply',jsonb_build_object('case_id',cid,'body','Synthetic member response with the requested details.'));result:=public.website_lab('support_case',jsonb_build_object('case_id',cid));if result->'case'->>'status'<>'in_review' then raise exception 'Member response did not return to the staff review queue';end if;if jsonb_array_length(result->'replies')<>2 then raise exception 'Internal note leaked';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);perform public.website_lab('release_member',jsonb_build_object('team_id',tid,'user_id',ids[2],'release_reason','conduct','reason','Synthetic restriction scenario only.'));
 if (select status from public.website_project_teams where id=tid)<>'paused' then raise exception 'Below-minimum team continued';end if;
 if exists(select 1 from public.website_project_team_members where team_id=tid and status='confirmed' and two_person_agreed_at is not null) then raise exception 'Stale pair consent survived composition change';end if;
 if exists(select 1 from private_website_lab.mail_outbox where meeting_id=mid and user_id=ids[2] and state in ('pending','failed')) then raise exception 'Removed recipient retained queued notices';end if;
 rejected:=false;begin perform public.website_lab('offer',jsonb_build_object('team_id',tid,'interest_id',apps[2],'role','Data Engineer'));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Restricted member got new offer';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);result:=public.website_lab('support_case',jsonb_build_object('case_id',cid));if result->'case'->>'id'<>cid::text then raise exception 'Former reporter lost own case';end if;
 rejected:=false;begin perform public.website_lab('outbox_list');exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'Member read mail queue';end if;
 if has_function_privilege('authenticated','public.website_lab_mail_worker(text,jsonb)','execute') or has_function_privilege('authenticated','private_website_lab.admission(text,jsonb)','execute') then raise exception 'Privileged mutation bypass exposed';end if;
end $test$;
rollback;
