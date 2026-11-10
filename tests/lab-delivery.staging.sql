-- Synthetic fixture transaction; no email provider is called.
begin;
do $test$
#variable_conflict use_variable
declare admin_id uuid; ids uuid[]:='{}'; apps uuid[]:='{}'; uid uuid; iid uuid; tid uuid; mid uuid; own_meeting uuid; cid uuid; k integer; rejected boolean; result jsonb; payload jsonb; job jsonb; task_id uuid;
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

 -- Delivery mutations use newly admitted synthetic members, never existing member data.
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 task_id:=(public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','task','title','Synthetic delivery task','owner_id',ids[2]))->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','in_progress'));
 rejected:=false;begin perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','blocked'));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Blank blocker accepted';end if;
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','blocked','blocker_reason','Synthetic missing source guidance'));
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','in_progress'));
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','ready_for_review'));
 rejected:=false;begin perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','done'));exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'Non-coordinator approved own work';end if;
 rejected:=false;begin perform public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','milestone','title','Unauthorised plan','owner_id',ids[2]));exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'Contributor planned delivery';end if;
 rejected:=false;begin perform public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','contribution','title','Invalid evidence','url','https://unrelated.invalid/repo','body',repeat('work ',8),'collaboration',repeat('team ',8)));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Non-GitHub evidence accepted';end if;
 mid:=(public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','contribution','title','Synthetic own evidence','url','https://github.com/Mettelo/example-demo','body',repeat('work ',8),'collaboration',repeat('team ',8)))->>'id')::uuid;
 if not exists(select 1 from private_website_lab.items where id=mid and author_id=ids[2] and owner_id=ids[2]) then raise exception 'Contribution author ownership lost';end if;
 perform public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','resource','title','Synthetic shared reference','url','https://www.ons.gov.uk/'));
 rejected:=false;begin perform public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','resource','title','Unsafe reference','url','javascript:alert(1)'));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Unsafe reference accepted';end if;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','in_progress','review_comment','Synthetic changes requested'));
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','ready_for_review'));
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','done'));
 result:=public.website_lab('task_history',jsonb_build_object('task_id',task_id));
 if jsonb_array_length(result)<>7 then raise exception 'Task history incomplete: %',jsonb_array_length(result);end if;
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);
 rejected:=false;begin perform public.website_lab('workspace',jsonb_build_object('team_id',tid));exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'Unadmitted outsider read workspace';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform public.website_lab('placement_status',jsonb_build_object('team_id',tid,'status','completed','reason','Synthetic delivery acceptance complete'));
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 result:=public.website_lab('workspace',jsonb_build_object('team_id',tid));
 if result->'team'->>'status'<>'completed' then raise exception 'Completed history inaccessible';end if;
 rejected:=false;begin perform public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','resource','title','Late write','url','https://www.ons.gov.uk/'));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Completed workspace accepted write';end if;
end $test$;
rollback;
select 'Lab delivery ownership, review, evidence and read-only tests passed; all fixtures rolled back.' as result;
