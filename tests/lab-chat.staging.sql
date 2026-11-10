-- Synthetic fixtures; every insert/update is rolled back. Website staging only.
begin;
do $test$
declare admin_id uuid; ids uuid[]:='{}'; uid uuid; iid uuid; a uuid; b uuid; task_id uuid; foreign_item uuid;
 msg uuid; nonce uuid:=gen_random_uuid(); i integer; result jsonb; rejected boolean;
begin
 select user_id into admin_id from private_website_lab.admins limit 1;
 for i in 1..4 loop
  uid:=gen_random_uuid();insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'lab-chat-fixture-'||uid||'@example.invalid',now(),'{"full_name":"Synthetic Chat Test"}');ids:=array_append(ids,uid);
 end loop;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 a:=(public.website_lab('create',jsonb_build_object('project_ref','MTL-DA-001','label','[ROLLBACK] Chat team','participation','team'))->>'team_id')::uuid;
 b:=(public.website_lab('create',jsonb_build_object('project_ref','MTL-DE-007','label','[ROLLBACK] Private other team','participation','team'))->>'team_id')::uuid;
 foreign_item:=(public.website_lab('add_item',jsonb_build_object('team_id',b,'kind','resource','title','Other team resource','url','https://github.com/Mettelo/example-demo'))->>'id')::uuid;
 for i in 1..3 loop
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(ids[i],'MTL-DA-001','team','Data Analyst',repeat('test ',8),repeat('test ',12),'{}','2026-09-03-v1') returning id into iid;
  perform public.website_lab('offer',jsonb_build_object('team_id',a,'interest_id',iid,'role','Data Analyst'));
  perform set_config('request.jwt.claim.sub',ids[i]::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',a,'response','accept'));
  perform set_config('request.jwt.claim.sub',admin_id::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',a,'user_id',ids[i],'reason','Synthetic access verification'));
 end loop;
 perform public.website_lab('coordinator',jsonb_build_object('team_id',a,'user_id',ids[1]));
 perform public.website_lab('prepare_workspace',jsonb_build_object('team_id',a));
 perform public.website_lab('start',jsonb_build_object('team_id',a));
 task_id:=(public.website_lab('add_item',jsonb_build_object('team_id',a,'kind','task','title','Synthetic linked task','owner_id',ids[2]))->>'id')::uuid;
 -- Non-member administrators may read, but cannot impersonate a team chat author.
 rejected:=false;begin perform public.website_lab('discussion',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','body','Admin impersonation'));exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Non-member administrator wrote team chat';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 msg:=(public.website_lab('discussion',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','body','@Teammate please review the dashboard.','mentioned_user_ids',jsonb_build_array(ids[3]),'client_nonce',nonce))->'item'->>'id')::uuid;
 result:=public.website_lab('discussion',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','body','@Teammate please review the dashboard.','mentioned_user_ids',jsonb_build_array(ids[3]),'client_nonce',nonce));
 if (result->'item'->>'id')::uuid<>msg or (select count(*) from private_website_lab.items where team_id=a and kind='message')<>1 then raise exception 'Retry duplicated a chat message';end if;
 if result->'item'->>'client_nonce'<>nonce::text then raise exception 'Client delivery nonce missing';end if;
 rejected:=false;begin perform public.website_lab('discussion',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','body','Invalid mention','mentioned_user_ids',jsonb_build_array(ids[4])));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Mentioned a person outside the team';end if;
 rejected:=false;begin perform public.website_lab('discussion_pin',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','message_id',msg,'pinned',true));exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Ordinary member pinned a message';end if;
 perform public.website_lab('discussion_edit',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','message_id',msg,'body','I completed the dashboard and the checks.'));
 perform public.website_lab('discussion_classify',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','message_id',msg,'message_type','decision'));
 rejected:=false;begin perform public.website_lab('chat_link',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','message_id',msg,'entity_id',foreign_item));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Linked a private item from another team';end if;
 perform public.website_lab('chat_link',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','message_id',msg,'entity_id',task_id));
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 perform public.website_lab('discussion_pin',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','message_id',msg,'pinned',true));
 rejected:=false;begin perform public.website_lab('discussion_edit',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','message_id',msg,'body','Coordinator editing another author'));exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Coordinator edited another author''s message';end if;
 result:=public.website_lab('chat_snapshot',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001'));
 if jsonb_array_length(result->'links')<>1 or result->'items'->0->>'pinned_at' is null then raise exception 'Message pin/link did not persist';end if;
 -- Milestone ownership and evidence quality are enforced in the database.
 rejected:=false;begin perform public.website_lab('add_item',jsonb_build_object('team_id',a,'kind','milestone','title','Unassigned milestone'));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Unassigned milestone accepted';end if;
 perform public.website_lab('add_item',jsonb_build_object('team_id',a,'kind','milestone','title','Assigned milestone','owner_id',ids[2]));
 rejected:=false;begin perform public.website_lab('assign_item',jsonb_build_object('item_id',task_id,'owner_id',ids[4]));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Assigned work to a person outside the team';end if;
 perform public.website_lab('assign_item',jsonb_build_object('item_id',task_id,'owner_id',ids[3]));
 rejected:=false;begin perform public.website_lab('add_item',jsonb_build_object('team_id',a,'kind','contribution','title','Incomplete evidence','url','https://example.com/repository','body',repeat('work ',10),'collaboration',repeat('team ',10)));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Non-GitHub evidence URL accepted';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 perform public.website_lab('discussion_delete',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','message_id',msg));
 result:=public.website_lab('chat_snapshot',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001'));
 if result->'items'->0->>'body'<>'' or jsonb_array_length(result->'links')<>0 then raise exception 'Deleted message content/link still exposed';end if;
 if exists(select 1 from jsonb_array_elements(public.website_lab('workspace',jsonb_build_object('team_id',a))->'items') x where x->>'kind'='message') then raise exception 'Raw deleted messages leaked through workspace snapshot';end if;
 perform set_config('request.jwt.claim.sub',ids[4]::text,true);
 rejected:=false;begin perform public.website_lab('chat_snapshot',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001'));exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Non-member read team chat';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);update public.website_project_teams set status='completed' where id=a;
 rejected:=false;begin perform public.website_lab('discussion',jsonb_build_object('team_id',a,'project_ref','MTL-DA-001','body','Write after completion'));exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Completed Chat accepted a write';end if;
end $test$;
select 'passed: saved Chat, safe retry, mentions, author edits/deletion, coordinator pins, labels, scoped links, milestone ownership, GitHub evidence, completed read-only' as result;
rollback;
