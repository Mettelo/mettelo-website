-- Synthetic data only; every change is rolled back. Run on website staging only.
begin;
do $test$
declare admin_id uuid; uid uuid; ids uuid[]:='{}'; interests uuid[]:='{}'; iid uuid; a uuid; b uuid; c uuid; task_id uuid; i integer; rejected boolean; snapshot jsonb;
begin
 select user_id into admin_id from private_website_lab.admins limit 1;
 if admin_id is null then raise exception 'Staging project administrator is not configured';end if;
 for i in 1..3 loop
  uid:=gen_random_uuid();insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'lab-fixture-'||uid||'@example.invalid',now(),'{"full_name":"Synthetic Lab Test"}');
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(uid,'MTL-DA-001','team','Data Analyst',repeat('test ',8),repeat('test ',12),'{}','2026-09-03-v1') returning id into iid;
  ids:=array_append(ids,uid);interests:=array_append(interests,iid);
 end loop;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 a:=(public.website_lab('create',jsonb_build_object('project_ref','MTL-DA-001','label','[ROLLBACK] Lab team A','participation','team'))->>'team_id')::uuid;
 b:=(public.website_lab('create',jsonb_build_object('project_ref','MTL-DA-001','label','[ROLLBACK] Lab team B','participation','team'))->>'team_id')::uuid;
 for i in 1..2 loop
  perform public.website_lab('offer',jsonb_build_object('team_id',a,'interest_id',interests[i],'role','Data Analyst'));
 end loop;
 -- Review and activation are separate; no headcount-based start.
 if (select status from public.website_project_teams where id=a)<>'forming' then raise exception 'Offering places started a team';end if;
 rejected:=false;begin perform public.website_lab('offer',jsonb_build_object('team_id',b,'interest_id',interests[1],'role','Data Analyst'));exception when unique_violation then rejected:=true;end;
 if not rejected then raise exception 'Duplicate current team within one project was allowed';end if;
 for i in 1..2 loop
  perform set_config('request.jwt.claim.sub',ids[i]::text,true);
  perform public.website_lab('respond',jsonb_build_object('team_id',a,'response','accept'));
 end loop;
 snapshot:=public.website_lab('mine');
 if jsonb_array_length(snapshot)<>1 or snapshot->0->>'membership_status'<>'confirmed' then raise exception 'Accepted member card missing';end if;
 rejected:=false;begin perform public.website_lab('create',jsonb_build_object('project_ref','MTL-DA-001','label','Forbidden','participation','team'));exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Ordinary member acquired admin rights';end if;
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);
 if jsonb_array_length(public.website_lab('mine'))<>0 then raise exception 'Other team placement leaked';end if;
 rejected:=false;begin perform public.website_lab('respond',jsonb_build_object('team_id',a,'response','accept'));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Member accepted another person''s offer';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform public.website_lab('coordinator',jsonb_build_object('team_id',a,'user_id',ids[1]));
 for i in 1..2 loop perform public.website_lab('verify_access',jsonb_build_object('team_id',a,'user_id',ids[i],'reason','Synthetic access verification'));end loop;
 rejected:=false;begin perform public.website_lab('start',jsonb_build_object('team_id',a));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Two-person team started without exception';end if;
 perform public.website_lab('allow_two',jsonb_build_object('team_id',a,'reason','Synthetic two-person pilot decision'));
 rejected:=false;begin perform public.website_lab('start',jsonb_build_object('team_id',a));exception when raise_exception then rejected:=sqlerrm='Both members must agree to the two-person arrangement';end;
 if not rejected then raise exception 'Two-person arrangement did not require explicit agreement';end if;
 for i in 1..2 loop
  perform set_config('request.jwt.claim.sub',ids[i]::text,true);
  perform public.website_lab('agree_two',jsonb_build_object('team_id',a));
 end loop;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 rejected:=false;begin perform public.website_lab('start',jsonb_build_object('team_id',a));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Unfinished workspace was activated';end if;
 perform public.website_lab('prepare_workspace',jsonb_build_object('team_id',a));
 perform public.website_lab('start',jsonb_build_object('team_id',a));
 if (select status from public.website_project_teams where id=a)<>'active' then raise exception 'Ready team did not start';end if;
 if public.website_lab('start',jsonb_build_object('team_id',a))->>'already_started'<>'true' then raise exception 'Repeated start was not safe';end if;
 task_id:=(public.website_lab('add_item',jsonb_build_object('team_id',a,'kind','task','title','Synthetic delivery task','body','Test ownership and persistence','owner_id',ids[2]))->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);
 rejected:=false;begin perform public.website_lab('workspace',jsonb_build_object('team_id',a));exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Unassigned member read another team workspace';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 snapshot:=public.website_lab('workspace',jsonb_build_object('team_id',a));
 if jsonb_array_length(snapshot->'items')<>2 then raise exception 'Prepared milestone/task missing from saved workspace';end if;
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','in_progress'));
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','ready_for_review'));
 rejected:=false;begin perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','done'));exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Task owner approved their own work without coordinator authority';end if;
 perform public.website_lab('discussion',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','body','Work is ready for review','mentioned_user_ids','[]'::jsonb));
 perform public.website_lab('add_item',jsonb_build_object('team_id',a,'kind','contribution','title','Synthetic evidence','url','https://github.com/Mettelo/example-demo','body','I implemented the synthetic dashboard and documented the quality checks.','collaboration','We divided analysis and engineering work and reviewed each other''s changes.'));
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','done'));
 if jsonb_array_length(public.website_lab('task_history',jsonb_build_object('task_id',task_id)))<>3 then raise exception 'Task history was not persisted';end if;
 update public.website_project_teams set status='completed' where id=a;
 rejected:=false;begin perform public.website_lab('add_item',jsonb_build_object('team_id',a,'kind','message','title','Forbidden completed write'));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Completed workspace accepted a write';end if;
 -- Same people may join a DIFFERENT selected project; three starts normally.
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 c:=(public.website_lab('create',jsonb_build_object('project_ref','MTL-DE-007','label','[ROLLBACK] Normal three-member team','participation','team'))->>'team_id')::uuid;
 for i in 1..3 loop
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(ids[i],'MTL-DE-007','team','Data Engineer',repeat('test ',8),repeat('test ',12),'{}','2026-09-03-v1') returning id into iid;
  perform public.website_lab('offer',jsonb_build_object('team_id',c,'interest_id',iid,'role','Data Engineer'));
  perform set_config('request.jwt.claim.sub',ids[i]::text,true);
  perform public.website_lab('respond',jsonb_build_object('team_id',c,'response','accept'));
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.website_lab('verify_access',jsonb_build_object('team_id',c,'user_id',ids[i],'reason','Synthetic normal-team access check'));
 end loop;
 perform public.website_lab('coordinator',jsonb_build_object('team_id',c,'user_id',ids[1]));
 perform public.website_lab('prepare_workspace',jsonb_build_object('team_id',c));
 perform public.website_lab('start',jsonb_build_object('team_id',c));
 if (select status from public.website_project_teams where id=c)<>'active' then raise exception 'Normal three-person team failed to start';end if;
 if has_table_privilege('authenticated','public.website_project_team_members','UPDATE') or has_table_privilege('authenticated','private_website_lab.admins','INSERT') then raise exception 'Direct membership/admin write allowed';end if;
 if has_function_privilege('anon','public.website_lab(text,jsonb)','EXECUTE') then raise exception 'Anonymous Lab API execution allowed';end if;
end $test$;
select 'passed: offer/acceptance, administrator boundary, same-project duplicate protection, private cards, manual start, two-person exception, unfinished Lab gate' as result;
rollback;
