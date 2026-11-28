begin;
alter table private_website_lab.items drop constraint items_body_check,
 add constraint items_body_check check(length(body)<=case when kind='message' then 5000 else 3000 end),
 add column collaboration text not null default '' check(length(collaboration)<=3000),
 add column message_type text not null default 'update' check(message_type in ('update','question','blocker','decision')),
 add column mentioned_user_ids uuid[] not null default '{}',
 add column edited_at timestamptz,
 add column deleted_at timestamptz,
 add column pinned_at timestamptz,
 add column linked_item_id uuid references private_website_lab.items(id),
 add column client_nonce uuid;
create unique index website_lab_chat_nonce on private_website_lab.items(team_id,author_id,client_nonce) where kind='message' and client_nonce is not null;
create index website_lab_chat_link on private_website_lab.items(linked_item_id) where linked_item_id is not null;

create function private_website_lab.chat(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid:=auth.uid(); admin boolean; member boolean; lead boolean; t public.website_project_teams;
 msg private_website_lab.items; linked private_website_lab.items; tid uuid:=(p_payload->>'team_id')::uuid;
 body_text text:=btrim(coalesce(p_payload->>'body','')); category text:=coalesce(p_payload->>'message_type','update');
 mentions uuid[]; nonce uuid; message_id uuid;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 select * into t from public.website_project_teams where id=tid for update;
 select exists(select 1 from private_website_lab.admins where user_id=actor) into admin;
 select exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status='confirmed') into member;
 if t.id is null or (not admin and (not member or not t.lab_enabled or t.status not in ('active','completed'))) then raise exception 'Team Chat access required' using errcode='42501';end if;
 if p_payload->>'project_ref' is distinct from t.project_ref then raise exception 'Project and team do not match' using errcode='42501';end if;
 lead:=member and t.coordinator_id=actor;
 if p_action='chat_snapshot' then
  return jsonb_build_object(
   'items',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'author_user_id',x.author_id,'body',case when x.deleted_at is not null then '' else x.body end,'message_type',x.message_type,'mentioned_user_ids',x.mentioned_user_ids,'created_at',x.created_at,'updated_at',x.updated_at,'edited_at',x.edited_at,'deleted_at',x.deleted_at,'pinned_at',x.pinned_at) order by x.created_at) from (select * from private_website_lab.items where team_id=tid and kind='message' order by created_at desc limit 500) x),'[]'),
   'teams',jsonb_build_array(jsonb_build_object('id',tid,'is_member',member,'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.full_name,'Member'),'headline',p.headline,'username',p.username,'role',m.role,'status',case when t.status='active' then 'active' else 'completed' end)) from public.website_project_team_members m left join public.profiles p on p.id=m.user_id where m.team_id=tid and m.status='confirmed'),'[]'))),
   'options',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'type',case x.kind when 'task' then 'task' when 'resource' then 'data_source' when 'milestone' then 'milestone' else 'deliverable' end,'label',x.title)) from private_website_lab.items x where x.team_id=tid and x.kind in ('task','milestone','resource','contribution')),'[]'),
   'links',coalesce((select jsonb_agg(jsonb_build_object('message_id',m.id,'id',x.id,'type',case x.kind when 'task' then 'task' when 'resource' then 'data_source' when 'milestone' then 'milestone' else 'deliverable' end,'label',x.title)) from private_website_lab.items m join private_website_lab.items x on x.id=m.linked_item_id and x.team_id=m.team_id where m.team_id=tid and m.kind='message' and m.deleted_at is null),'[]'));
 end if;
 -- The source platform keeps administrators read-only unless they belong to the team.
 if not member or t.status<>'active' then raise exception 'Only active team members can change Chat' using errcode='42501';end if;
 if p_action in ('discussion','discussion_edit') then
  if length(body_text) not between 1 and 5000 then raise exception 'Write a message of up to 5000 characters';end if;
  if jsonb_typeof(coalesce(p_payload->'mentioned_user_ids','[]'))<>'array' then raise exception 'Invalid mentions';end if;
  select coalesce(array_agg(distinct v::uuid),'{}') into mentions from jsonb_array_elements_text(coalesce(p_payload->'mentioned_user_ids','[]')) v;
  if cardinality(mentions)>4 or exists(select 1 from unnest(mentions) id where not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=id and status='confirmed')) then raise exception 'Mention only members of this team';end if;
 end if;
 if p_action='discussion' then
  if category not in ('update','question','blocker','decision') then raise exception 'Choose a supported message type';end if;
  nonce:=nullif(p_payload->>'client_nonce','')::uuid;
  if nonce is not null then select * into msg from private_website_lab.items where team_id=tid and author_id=actor and client_nonce=nonce and kind='message';end if;
  if msg.id is null then
   insert into private_website_lab.items(team_id,kind,title,body,author_id,message_type,mentioned_user_ids,client_nonce) values(tid,'message','Team message',body_text,actor,category,mentions,nonce) returning * into msg;
  end if;
 else
  message_id:=(p_payload->>'message_id')::uuid;
  select * into msg from private_website_lab.items where id=message_id and team_id=tid and kind='message' for update;
  if msg.id is null or msg.deleted_at is not null then raise exception 'Message is no longer available';end if;
  if p_action in ('discussion_edit','discussion_delete') and msg.author_id<>actor then raise exception 'Only the author can edit or delete this message' using errcode='42501';end if;
  if p_action='discussion_pin' and not lead then raise exception 'Only the coordinator can pin messages' using errcode='42501';end if;
  if p_action in ('discussion_classify','chat_link') and msg.author_id<>actor and not lead then raise exception 'Author or coordinator access required' using errcode='42501';end if;
  if p_action='discussion_edit' then
   update private_website_lab.items set body=body_text,mentioned_user_ids=mentions,edited_at=now(),updated_at=now() where id=msg.id returning * into msg;
  elsif p_action='discussion_delete' then
   update private_website_lab.items set deleted_at=now(),pinned_at=null,linked_item_id=null,mentioned_user_ids='{}',updated_at=now() where id=msg.id returning * into msg;
  elsif p_action='discussion_pin' then
   update private_website_lab.items set pinned_at=case when coalesce((p_payload->>'pinned')::boolean,false) then now() else null end,updated_at=now() where id=msg.id returning * into msg;
  elsif p_action='discussion_classify' then
   if category not in ('update','question','blocker','decision') then raise exception 'Choose a supported message type';end if;
   update private_website_lab.items set message_type=category,updated_at=now() where id=msg.id returning * into msg;
  elsif p_action='chat_link' then
   if nullif(p_payload->>'entity_id','') is not null then
    select * into linked from private_website_lab.items where id=(p_payload->>'entity_id')::uuid and team_id=tid and kind in ('task','milestone','resource','contribution');
    if linked.id is null then raise exception 'Select an item in this team only';end if;
   end if;
   update private_website_lab.items set linked_item_id=linked.id,updated_at=now() where id=msg.id returning * into msg;
  else raise exception 'Unsupported Chat action';end if;
 end if;
 insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,tid,jsonb_build_object('message_id',msg.id));
 return jsonb_build_object('item',jsonb_build_object('id',msg.id,'author_user_id',msg.author_id,'message_type',msg.message_type,'body',case when msg.deleted_at is not null then '' else msg.body end,'mentioned_user_ids',msg.mentioned_user_ids,'created_at',msg.created_at,'updated_at',msg.updated_at,'edited_at',msg.edited_at,'deleted_at',msg.deleted_at,'pinned_at',msg.pinned_at),
  'link',case when linked.id is null then null else jsonb_build_object('message_id',msg.id,'id',linked.id,'type',case linked.kind when 'task' then 'task' when 'resource' then 'data_source' when 'milestone' then 'milestone' else 'deliverable' end,'label',linked.title) end);
end $$;
revoke all on function private_website_lab.chat(text,jsonb) from public,anon;
grant execute on function private_website_lab.chat(text,jsonb) to authenticated;

create or replace function private_website_lab.workspace(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid:=auth.uid(); admin boolean; lead boolean; t public.website_project_teams; item private_website_lab.items;
 tid uuid; kind text; item_id uuid; target text; result jsonb;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 select exists(select 1 from private_website_lab.admins where user_id=actor) into admin;
 if p_action='assign_item' then
  select * into item from private_website_lab.items where id=(p_payload->>'item_id')::uuid and kind in ('task','milestone') for update;
  tid:=item.team_id;
 elsif p_action in ('task_status','task_history') then
  select * into item from private_website_lab.items where id=(p_payload->>'task_id')::uuid and kind='task' for update;
  tid:=item.team_id;
 else tid:=(p_payload->>'team_id')::uuid;end if;
 select * into t from public.website_project_teams where id=tid for update;
 if t.id is null then raise exception 'Workspace not found' using errcode='42501';end if;
 if not admin and (not t.lab_enabled or t.status not in ('active','completed') or not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status='confirmed')) then raise exception 'Workspace access required' using errcode='42501';end if;
 lead:=admin or t.coordinator_id=actor;
 if p_action='workspace' then
  return jsonb_build_object('team',to_jsonb(t),'current_user_id',actor,'can_lead',lead,
   'members',(select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.full_name,'Member'),'role',m.role,'username',p.username,'headline',p.headline)) from public.website_project_team_members m left join public.profiles p on p.id=m.user_id where m.team_id=tid and m.status='confirmed'),
   'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from private_website_lab.items x where x.team_id=tid and x.kind<>'message'),'[]'));
 end if;
 if p_action='task_history' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',a.id::text,'event_type',a.action,'from_status',a.payload->>'from_status','to_status',a.payload->>'status','comment',coalesce(a.payload->>'blocker_reason',a.payload->>'review_comment'),'created_at',a.created_at,'actor_name',coalesce(p.full_name,'Member')) order by a.created_at) from private_website_lab.audit a left join public.profiles p on p.id=a.actor_id where a.team_id=tid and a.payload->>'task_id'=item.id::text),'[]');
 end if;
 if p_action='prepare_workspace' then
  if not admin or t.status<>'forming' then raise exception 'A forming team and administrator access are required' using errcode='42501';end if;
  if not t.lab_enabled then
   insert into private_website_lab.items(team_id,kind,title,body,author_id,owner_id) values(tid,'milestone','Kickoff and agree delivery plan','Review the brief, agree responsibilities, repository access and the first delivery milestone.',actor,t.coordinator_id);
   update public.website_project_teams set lab_enabled=true where id=tid;
  end if;
 elsif p_action='assign_item' then
  if not lead or (t.status<>'active' and not (admin and t.status='forming')) then raise exception 'Coordinator access to an editable team is required' using errcode='42501';end if;
  if item.status='done' then raise exception 'Completed work cannot be reassigned';end if;
  if not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=(p_payload->>'owner_id')::uuid and status='confirmed') then raise exception 'Choose a confirmed member of this team';end if;
  update private_website_lab.items set owner_id=(p_payload->>'owner_id')::uuid,updated_at=now() where id=item.id;
 elsif p_action='task_status' then
  if t.status<>'active' then raise exception 'Task updates require an active team';end if;
  if not lead and item.owner_id is distinct from actor then raise exception 'Task owner or coordinator access required' using errcode='42501';end if;
  target:=p_payload->>'status';
  if target is null or not ((item.status='todo' and target in ('in_progress','blocked')) or (item.status='in_progress' and target in ('blocked','ready_for_review')) or (item.status='blocked' and target='in_progress') or (item.status='ready_for_review' and target in ('in_progress','done'))) then raise exception 'This task transition is not available';end if;
  if item.status='ready_for_review' and not lead then raise exception 'Only a coordinator can review a task' using errcode='42501';end if;
  if target='blocked' and coalesce(length(btrim(p_payload->>'blocker_reason')),0) not between 1 and 1500 then raise exception 'Explain the blocker';end if;
  if item.status='ready_for_review' and target='in_progress' and coalesce(length(btrim(p_payload->>'review_comment')),0) not between 1 and 1500 then raise exception 'Explain the requested changes';end if;
  update private_website_lab.items set status=target,updated_at=now() where id=item.id;
  p_payload:=p_payload||jsonb_build_object('from_status',item.status);
 elsif p_action='add_item' then
  kind:=p_payload->>'kind';
  if kind='message' then raise exception 'Send messages through Team Chat';end if;
  if kind='milestone' and nullif(p_payload->>'owner_id','') is null then raise exception 'Assign an owner to this milestone';end if;
  if kind='contribution' and (coalesce(p_payload->>'url','') !~ '^https://github[.]com/[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+/?$' or coalesce(length(btrim(p_payload->>'body')),0)<20 or coalesce(length(btrim(p_payload->>'collaboration')),0) not between 20 and 3000) then raise exception 'Add a GitHub repository, what you delivered and how you worked together (at least 20 characters each)';end if;
  if kind is null or kind not in ('milestone','task','message','resource','contribution') then raise exception 'Choose a supported workspace item';end if;
  if t.status<>'active' and not (admin and t.status='forming' and kind in ('task','milestone','resource')) then raise exception 'This workspace is read-only';end if;
  if kind in ('task','milestone') and not lead then raise exception 'Only a coordinator can plan delivery' using errcode='42501';end if;
  if coalesce(length(btrim(p_payload->>'title')),0) not between 1 and 180 or length(coalesce(p_payload->>'body',''))>3000 then raise exception 'Add a title and keep details within 3000 characters';end if;
  if kind in ('resource','contribution') and (coalesce(p_payload->>'url','') !~ '^https://[^/@[:space:]]+([/:?][^[:space:]]*)?$' or length(p_payload->>'url')>600) then raise exception 'Add a valid HTTPS link without login details';end if;
  if nullif(p_payload->>'owner_id','') is not null and not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=(p_payload->>'owner_id')::uuid and status='confirmed') then raise exception 'The task owner must be a confirmed team member';end if;
  insert into private_website_lab.items(team_id,kind,title,body,url,owner_id,author_id,collaboration) values(tid,kind,btrim(p_payload->>'title'),coalesce(p_payload->>'body',''),case when kind in ('resource','contribution') then p_payload->>'url' else null end,case when kind in ('task','milestone') then nullif(p_payload->>'owner_id','')::uuid else actor end,actor,case when kind='contribution' then btrim(p_payload->>'collaboration') else '' end) returning id into item_id;
 else raise exception 'Unsupported workspace action';end if;
 insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,tid,p_payload||jsonb_build_object('item_id',item_id));
 return jsonb_build_object('ok',true,'id',item_id);
end $$;

create or replace function public.website_lab(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if p_action='agree_two' then return private_website_lab.agree_two((p_payload->>'team_id')::uuid);end if;
 if p_action in ('chat_snapshot','discussion','discussion_edit','discussion_delete','discussion_pin','discussion_classify','chat_link') then return private_website_lab.chat(p_action,p_payload);end if;
 if p_action in ('workspace','prepare_workspace','task_status','task_history','add_item','assign_item') then return private_website_lab.workspace(p_action,p_payload);end if;
 return private_website_lab.control(p_action,p_payload);
end $$;
commit;
