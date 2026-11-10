begin;
create table private_website_lab.items(
 id uuid primary key default gen_random_uuid(),team_id uuid not null references public.website_project_teams(id),
 kind text not null check(kind in ('milestone','task','message','resource','contribution')),
 title text not null check(length(title) between 1 and 180),body text not null default '' check(length(body)<=3000),
 url text check(url is null or url ~ '^https://[^/@[:space:]]+([/:?][^[:space:]]*)?$'),
 status text not null default 'todo' check(status in ('todo','in_progress','blocked','ready_for_review','done')),
 owner_id uuid references auth.users(id),author_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index website_lab_items_team on private_website_lab.items(team_id,kind,created_at);
alter table private_website_lab.items enable row level security;
revoke all on private_website_lab.items from public,anon,authenticated;
create function private_website_lab.workspace(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid:=auth.uid(); admin boolean; lead boolean; t public.website_project_teams; item private_website_lab.items;
 tid uuid; kind text; item_id uuid; target text; result jsonb;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 select exists(select 1 from private_website_lab.admins where user_id=actor) into admin;
 if p_action in ('task_status','task_history') then
  select * into item from private_website_lab.items where id=(p_payload->>'task_id')::uuid and kind='task' for update;
  tid:=item.team_id;
 else tid:=(p_payload->>'team_id')::uuid;end if;
 select * into t from public.website_project_teams where id=tid for update;
 if t.id is null then raise exception 'Workspace not found' using errcode='42501';end if;
 if not admin and (not t.lab_enabled or t.status not in ('active','completed') or not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status='confirmed')) then raise exception 'Workspace access required' using errcode='42501';end if;
 lead:=admin or t.coordinator_id=actor;
 if p_action='workspace' then
  return jsonb_build_object('team',to_jsonb(t),'current_user_id',actor,'can_lead',lead,
   'members',(select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.full_name,'Member'),'role',m.role)) from public.website_project_team_members m left join public.profiles p on p.id=m.user_id where m.team_id=tid and m.status='confirmed'),
   'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from private_website_lab.items x where x.team_id=tid),'[]'));
 end if;
 if p_action='task_history' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',a.id::text,'event_type',a.action,'from_status',a.payload->>'from_status','to_status',a.payload->>'status','comment',coalesce(a.payload->>'blocker_reason',a.payload->>'review_comment'),'created_at',a.created_at,'actor_name',coalesce(p.full_name,'Member')) order by a.created_at) from private_website_lab.audit a left join public.profiles p on p.id=a.actor_id where a.team_id=tid and a.payload->>'task_id'=item.id::text),'[]');
 end if;
 if p_action='prepare_workspace' then
  if not admin or t.status<>'forming' then raise exception 'A forming team and administrator access are required' using errcode='42501';end if;
  if not t.lab_enabled then
   insert into private_website_lab.items(team_id,kind,title,body,author_id) values(tid,'milestone','Kickoff and agree delivery plan','Review the brief, agree responsibilities, repository access and the first delivery milestone.',actor);
   update public.website_project_teams set lab_enabled=true where id=tid;
  end if;
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
  if kind is null or kind not in ('milestone','task','message','resource','contribution') then raise exception 'Choose a supported workspace item';end if;
  if t.status<>'active' and not (admin and t.status='forming' and kind in ('task','milestone','resource')) then raise exception 'This workspace is read-only';end if;
  if kind in ('task','milestone') and not lead then raise exception 'Only a coordinator can plan delivery' using errcode='42501';end if;
  if coalesce(length(btrim(p_payload->>'title')),0) not between 1 and 180 or length(coalesce(p_payload->>'body',''))>3000 then raise exception 'Add a title and keep details within 3000 characters';end if;
  if kind in ('resource','contribution') and (coalesce(p_payload->>'url','') !~ '^https://[^/@[:space:]]+([/:?][^[:space:]]*)?$' or length(p_payload->>'url')>600) then raise exception 'Add a valid HTTPS link without login details';end if;
  if nullif(p_payload->>'owner_id','') is not null and not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=(p_payload->>'owner_id')::uuid and status='confirmed') then raise exception 'The task owner must be a confirmed team member';end if;
  insert into private_website_lab.items(team_id,kind,title,body,url,owner_id,author_id) values(tid,kind,btrim(p_payload->>'title'),coalesce(p_payload->>'body',''),case when kind in ('resource','contribution') then p_payload->>'url' else null end,case when kind='task' then nullif(p_payload->>'owner_id','')::uuid else actor end,actor) returning id into item_id;
 else raise exception 'Unsupported workspace action';end if;
 insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,tid,p_payload||jsonb_build_object('item_id',item_id));
 return jsonb_build_object('ok',true,'id',item_id);
end $$;
revoke all on function private_website_lab.workspace(text,jsonb) from public,anon;
grant execute on function private_website_lab.workspace(text,jsonb) to authenticated;
create or replace function public.website_lab(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if p_action='agree_two' then return private_website_lab.agree_two((p_payload->>'team_id')::uuid);end if;
 if p_action in ('workspace','prepare_workspace','task_status','task_history','add_item') then return private_website_lab.workspace(p_action,p_payload);end if;
 return private_website_lab.control(p_action,p_payload);
end $$;
commit;
