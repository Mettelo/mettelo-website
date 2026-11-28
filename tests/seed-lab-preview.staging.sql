-- Retained synthetic preview only. Never run on a production project.
begin;
do $demo$
declare tid uuid; admin_id uuid; uid uuid; iid uuid; task_id uuid; msg uuid; ids uuid[]:='{}'; i integer;
 names text[]:=array['Alex Demo','Maya Demo','Sam Demo'];
 roles text[]:=array['AI Engineer','LLM Engineer','AI Governance / Assurance'];
 headlines text[]:=array['Demo profile · AI engineering and delivery','Demo profile · Retrieval and evaluation','Demo profile · Data governance and assurance'];
begin
 select id into tid from public.website_project_teams where label='[STAGING TEST] Lab transfer QA' and project_ref='MTL-AI-010';
 if tid is null then raise exception 'Create the named staging demo first';end if;
 if exists(select 1 from public.website_project_team_members where team_id=tid) then return;end if;
 select user_id into admin_id from private_website_lab.admins limit 1;
 for i in 1..3 loop
  uid:=gen_random_uuid();ids:=array_append(ids,uid);
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'lab-demo-'||uid||'@example.invalid',now(),jsonb_build_object('full_name',names[i]));
  update public.profiles set full_name=names[i],headline=headlines[i] where id=uid;
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(uid,'MTL-AI-010','team',roles[i],'Synthetic demonstration only; this is not a community member.','Synthetic preview contribution for checking team cards and chat.','{}','2026-09-03-v1') returning id into iid;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.website_lab('offer',jsonb_build_object('team_id',tid,'interest_id',iid,'role',roles[i]));
  perform set_config('request.jwt.claim.sub',uid::text,true);
  perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept'));
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',uid,'reason','Synthetic preview only; no real GitHub invitation or repository access granted.'));
 end loop;
 perform public.website_lab('coordinator',jsonb_build_object('team_id',tid,'user_id',ids[1]));
 for iid in select id from private_website_lab.items where team_id=tid and kind in ('milestone','task') and owner_id is null loop
  perform public.website_lab('assign_item',jsonb_build_object('item_id',iid,'owner_id',ids[1]));
 end loop;
 perform public.website_lab('prepare_workspace',jsonb_build_object('team_id',tid));
 task_id:=(public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','task','title','[DEMO] Build retrieval evaluation','body','Demonstrate ownership of retrieval and citation checks.','owner_id',ids[2]))->>'id')::uuid;
 perform public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','milestone','title','[DEMO] Review sources and evaluation results','body','Agree the source-use rules and review the evaluation approach.','owner_id',ids[3]));
 perform public.website_lab('start',jsonb_build_object('team_id',tid));
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 msg:=(public.website_lab('discussion',jsonb_build_object('team_id',tid,'project_ref','MTL-AI-010','body','Demo: Welcome, team. Let’s keep approved sources, decisions and evaluation results together here.','message_type','decision'))->'item'->>'id')::uuid;
 perform public.website_lab('discussion_pin',jsonb_build_object('team_id',tid,'project_ref','MTL-AI-010','message_id',msg,'pinned',true));
 perform public.website_lab('chat_link',jsonb_build_object('team_id',tid,'project_ref','MTL-AI-010','message_id',msg,'entity_id',task_id));
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 perform public.website_lab('discussion',jsonb_build_object('team_id',tid,'project_ref','MTL-AI-010','body','Demo: I’ll own the retrieval evaluation. @Sam Demo, could you review the source-use rules?','message_type','question','mentioned_user_ids',jsonb_build_array(ids[3])));
 perform public.website_lab('task_status',jsonb_build_object('task_id',task_id,'status','in_progress'));
 perform public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','contribution','title','[DEMO] Retrieval prototype and source review','url','https://github.com/Mettelo/MTL-AI-010-NHS-Operational-Guidance-Knowledge-Assistant','body','Demo evidence: drafted a retrieval prototype and described the evaluation checks in the repository. This is sample content, not verified delivery.','collaboration','Demo collaboration: Alex coordinated the work, Maya drafted the retrieval approach and Sam reviewed source-use constraints. We shared feedback before combining the work.'));
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);
 perform public.website_lab('discussion',jsonb_build_object('team_id',tid,'project_ref','MTL-AI-010','body','Demo: Yes. I’ll document licence restrictions and flag any source we should not reproduce.','message_type','update'));
end $demo$;
commit;
