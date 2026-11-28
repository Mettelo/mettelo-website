-- Member home recognition and in-app notifications. Staging rollout only.
begin;
alter table private_website_lab.items add column milestone_accepted_at timestamptz, add column milestone_accepted_by uuid references auth.users(id), add column milestone_evidence_id uuid references private_website_lab.items(id), add column milestone_review_note text;
create table private_website_lab.deliveries(team_id uuid primary key references public.website_project_teams(id),evidence_id uuid not null references private_website_lab.items(id),confirmed_by uuid not null references auth.users(id),confirmed_at timestamptz not null default now(),note text not null check(length(note) between 20 and 1500));
create table private_website_lab.work_skills(item_id uuid not null references private_website_lab.items(id),skill text not null check(length(skill) between 2 and 40),recorded_at timestamptz not null default now(),primary key(item_id,skill));
create table private_website_lab.notifications(id uuid primary key default gen_random_uuid(),recipient_id uuid not null references auth.users(id),event_key text not null,title text not null,href text not null check(href like '/member%' or href='/opportunities'),team_id uuid references public.website_project_teams(id),created_at timestamptz not null default now(),read_at timestamptz,unique(recipient_id,event_key));
create index member_notifications_recipient_time on private_website_lab.notifications(recipient_id,created_at desc);
alter table private_website_lab.deliveries enable row level security;
alter table private_website_lab.work_skills enable row level security;
alter table private_website_lab.notifications enable row level security;
revoke all on private_website_lab.deliveries,private_website_lab.work_skills,private_website_lab.notifications from public,anon,authenticated;

create function private_website_lab.notify_member(uid uuid,event text,title text,href text,team uuid default null) returns void language sql security definer set search_path='' as $$
 insert into private_website_lab.notifications(recipient_id,event_key,title,href,team_id) values(uid,event,title,href,team) on conflict(recipient_id,event_key) do nothing;
$$;
revoke all on function private_website_lab.notify_member(uuid,text,text,text,uuid) from public,anon,authenticated;

create function private_website_lab.member_event() returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid; tid uuid; url text; heading text; event text; rowdata jsonb:=to_jsonb(new); prior jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
begin
 if tg_table_name='website_project_interests' then
  perform private_website_lab.notify_member(new.user_id,'application:'||new.id,'Your application has been submitted','/member/projects/'||new.project_ref||'/interest');
 elsif tg_table_name='interest_reviews' then
  if tg_op='INSERT' or new.status is distinct from old.status then
   select user_id into uid from public.website_project_interests where id=new.interest_id;
   perform private_website_lab.notify_member(uid,'review:'||new.interest_id||':'||new.status||':'||new.updated_at,'Your application has an update: '||new.status,'/member/applications');
  end if;
 elsif tg_table_name='website_project_team_members' then
  if tg_op='INSERT' or new.status is distinct from old.status or new.admitted_at is distinct from old.admitted_at or new.offer_expires_at is distinct from old.offer_expires_at then
   heading:=case when new.status='offered' then 'A project offer is ready for you' when new.status='confirmed' and new.admitted_at is not null then 'Your Lab access is ready' when new.status='confirmed' then 'Your project place is confirmed' else 'Your project placement has changed' end;
   perform private_website_lab.notify_member(new.user_id,'placement:'||new.team_id||':'||new.status||':'||coalesce(new.admitted_at::text,'pending')||':'||coalesce(new.offer_expires_at::text,''),heading,'/member/lab');
  end if;
 elsif tg_table_name='website_project_teams' then
  if new.status is distinct from old.status then
   for uid in select user_id from public.website_project_team_members where team_id=new.id and status='confirmed' loop
    perform private_website_lab.notify_member(uid,'team:'||new.id||':'||new.status||':'||clock_timestamp(),'Your project is now '||new.status,'/member/lab');
   end loop;
  end if;
 elsif tg_table_name='items' then
  tid:=new.team_id;url:='/member/lab/'||tid;
  if new.kind in ('task','milestone') then
   if new.owner_id is not null and (tg_op='INSERT' or new.owner_id is distinct from old.owner_id) then
    perform private_website_lab.notify_member(new.owner_id,'assigned:'||new.id||':'||new.owner_id||':'||new.updated_at,'A '||new.kind||' has been assigned to you',url||'?view='||case when new.kind='task' then 'tasks#task-' else 'plan#milestone-' end||new.id,tid);
   end if;
   if tg_op='UPDATE' and new.status is distinct from old.status then
    if new.owner_id is not null then perform private_website_lab.notify_member(new.owner_id,'work:'||new.id||':'||new.status||':'||new.updated_at,case when new.status='done' then 'Your '||new.kind||' has been accepted' when old.status='ready_for_review' and new.status='in_progress' then 'Changes have been requested on your task' else 'Your '||new.kind||' is now '||replace(new.status,'_',' ') end,url||'?view='||case when new.kind='task' then 'tasks#task-' else 'plan#milestone-' end||new.id,tid);end if;
    if new.status='ready_for_review' then select coordinator_id into uid from public.website_project_teams where id=tid;if uid is not null and uid is distinct from new.owner_id then perform private_website_lab.notify_member(uid,'review-needed:'||new.id||':'||new.updated_at,'A task is ready for your review',url||'?view=tasks#task-'||new.id,tid);end if;end if;
   end if;
  elsif new.kind='message' and new.deleted_at is null then
   for uid in select m.user_id from public.website_project_team_members m where m.team_id=tid and m.status='confirmed' and m.admitted_at is not null and m.user_id<>new.author_id and (m.user_id=any(coalesce(new.mentioned_user_ids,'{}'::uuid[])) or new.pinned_at is not null) loop
    if tg_op='INSERT' or (uid=any(coalesce(new.mentioned_user_ids,'{}'::uuid[])) and not uid=any(coalesce(old.mentioned_user_ids,'{}'::uuid[]))) or (new.pinned_at is not null and old.pinned_at is null) then
     perform private_website_lab.notify_member(uid,'message:'||new.id||':'||case when uid=any(coalesce(new.mentioned_user_ids,'{}'::uuid[])) then 'mention' else 'announcement' end,case when uid=any(coalesce(new.mentioned_user_ids,'{}'::uuid[])) then 'You were mentioned in your team discussion' else 'Your team has an important announcement' end,url||'?view=chat#message-'||new.id,tid);
    end if;
   end loop;
  end if;
 elsif tg_table_name='meetings' then
  for uid in select user_id from public.website_project_team_members where team_id=new.team_id and status='confirmed' and admitted_at is not null and user_id<>new.organiser_id loop
   perform private_website_lab.notify_member(uid,'meeting:'||new.id||':'||new.revision,case when new.status='cancelled' then 'A team meeting has been cancelled' when tg_op='INSERT' then 'A team meeting has been scheduled' else 'A team meeting has changed' end,'/member/lab/'||new.team_id||'?view=events',new.team_id);
  end loop;
 elsif tg_table_name='support_replies' then
  if not new.internal then select reporter_id into uid from private_website_lab.support_cases where id=new.case_id;if uid<>new.author_id then perform private_website_lab.notify_member(uid,'support:'||new.id,'Mettelo has replied to your enquiry','/member/enquiries');end if;end if;
 elsif tg_table_name='users' then
  if new.email_confirmed_at is not null and (new.encrypted_password is distinct from old.encrypted_password or new.email is distinct from old.email) then perform private_website_lab.notify_member(new.id,'security:'||new.id||':'||clock_timestamp(),'Your account sign-in details have changed','/member/account');end if;
 end if;
 return new;
end $$;
revoke all on function private_website_lab.member_event() from public,anon,authenticated;
create trigger member_application_notice after insert on public.website_project_interests for each row execute function private_website_lab.member_event();
create trigger member_review_notice after insert or update on private_website_lab.interest_reviews for each row execute function private_website_lab.member_event();
create trigger member_placement_notice after insert or update on public.website_project_team_members for each row execute function private_website_lab.member_event();
create trigger member_team_notice after update of status on public.website_project_teams for each row execute function private_website_lab.member_event();
create trigger member_work_notice after insert or update on private_website_lab.items for each row execute function private_website_lab.member_event();
create trigger member_meeting_notice after insert or update on private_website_lab.meetings for each row execute function private_website_lab.member_event();
create trigger member_support_notice after insert on private_website_lab.support_replies for each row execute function private_website_lab.member_event();
create trigger member_security_notice after update of encrypted_password,email on auth.users for each row execute function private_website_lab.member_event();

create function private_website_lab.member_home(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid:=auth.uid(); ids uuid[]; tid uuid; iid uuid; ev uuid; t public.website_project_teams; i private_website_lab.items; lead boolean; result jsonb; r record; labels text[]; label text;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 select coalesce(array_agg(m.team_id),'{}') into ids from public.website_project_team_members m join public.website_project_teams t on t.id=m.team_id where m.user_id=actor and m.status='confirmed' and m.admitted_at is not null and t.lab_enabled and t.status in ('active','completed');
 if action='progress' then
  return jsonb_build_object('milestones',(select count(*) from private_website_lab.items where team_id=any(ids) and kind='milestone' and owner_id=actor and milestone_accepted_at is not null and status='done'),
   'milestones_month',(select count(*) from private_website_lab.items where team_id=any(ids) and kind='milestone' and owner_id=actor and status='done' and milestone_accepted_at>=date_trunc('month',now() at time zone 'Europe/London') at time zone 'Europe/London'),
   'delivered',(select count(distinct t.project_ref) from private_website_lab.deliveries d join public.website_project_teams t on t.id=d.team_id where d.team_id=any(ids) and t.status='completed'),
   'skills',(select count(distinct s.skill) from private_website_lab.work_skills s join private_website_lab.items i on i.id=s.item_id where i.team_id=any(ids) and i.author_id=actor and i.kind='contribution'),
   'next',(select jsonb_build_object('id',i.id,'team_id',i.team_id,'kind',i.kind,'title',i.title,'status',i.status,'owner_id',i.owner_id,'created_at',i.created_at) from private_website_lab.items i join public.website_project_teams t on t.id=i.team_id where i.team_id=any(ids) and t.status='active' and i.owner_id=actor and i.kind in ('task','milestone') and i.status<>'done' order by case when i.kind='milestone' then 4 when i.status='in_progress' then 0 when i.status='todo' then 1 when i.status='blocked' then 2 else 3 end,i.created_at,i.id limit 1));
 elsif action in ('notifications','read','unread','read_all') then
  if action='notifications' then
   -- Backfill only the current member's existing applications and live placements, idempotently.
   for r in select id,project_ref from public.website_project_interests where user_id=actor loop perform private_website_lab.notify_member(actor,'application:'||r.id,'Your application has been submitted','/member/projects/'||r.project_ref||'/interest');end loop;
   for r in select * from public.website_project_team_members where user_id=actor and status='offered' and (offer_expires_at is null or offer_expires_at>now()) loop
    perform private_website_lab.notify_member(actor,'placement:'||r.team_id||':offered:pending:'||coalesce(r.offer_expires_at::text,''),'A project offer is ready for you','/member/lab');
    if r.offer_expires_at between now() and now()+interval '48 hours' then perform private_website_lab.notify_member(actor,'offer-reminder:'||r.team_id||':'||r.offer_expires_at,'Your project offer expires within 48 hours','/member/lab');end if;
   end loop;
  elsif action='read_all' then
   update private_website_lab.notifications n set read_at=now() where recipient_id=actor and read_at is null and (payload->>'before')::timestamptz>=created_at;
  else
   update private_website_lab.notifications set read_at=case when action='read' then now() else null end where id=(payload->>'id')::uuid and recipient_id=actor;
  end if;
  -- Never expose team events to a member who has since lost workspace access.
  select jsonb_build_object('unread',(select count(*) from private_website_lab.notifications where recipient_id=actor and read_at is null and (team_id is null or team_id=any(ids))),
   'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,title,href,created_at,read_at from private_website_lab.notifications where recipient_id=actor and (team_id is null or team_id=any(ids)) order by created_at desc,id desc limit 50) x),'[]'), 'as_of',clock_timestamp()) into result;
  return result;
 elsif action in ('accept_milestone','confirm_delivery','record_skills','recognition') then
  tid:=(payload->>'team_id')::uuid;select * into t from public.website_project_teams where id=tid for update;
  lead:=exists(select 1 from private_website_lab.admins where user_id=actor) or (t.coordinator_id=actor and tid=any(ids));
  if t.id is null or not (lead or tid=any(ids)) then raise exception 'Workspace access required' using errcode='42501';end if;
  if action='recognition' then return jsonb_build_object('delivery',(select to_jsonb(d) from private_website_lab.deliveries d where team_id=tid),'skills',coalesce((select jsonb_agg(to_jsonb(s)) from private_website_lab.work_skills s join private_website_lab.items i on i.id=s.item_id where i.team_id=tid),'[]'));end if;
  if action='record_skills' then
   select * into i from private_website_lab.items where id=(payload->>'item_id')::uuid and team_id=tid and kind='contribution' and author_id=actor for update;
   if i.id is null or not tid=any(ids) then raise exception 'Choose your own contribution in an accessible Lab' using errcode='42501';end if;
   if length(coalesce(payload->>'skills',''))>320 then raise exception 'Keep the skill list within 320 characters';end if;
   select array_agg(distinct lower(btrim(x))) into labels from unnest(string_to_array(payload->>'skills',',')) x where btrim(x)<>'';
   if coalesce(cardinality(labels),0) not between 1 and 8 then raise exception 'Add between one and eight skills, separated by commas';end if;
   foreach label in array labels loop if length(label) not between 2 and 40 then raise exception 'Each skill needs 2 to 40 characters';end if;end loop;
   delete from private_website_lab.work_skills where item_id=i.id;
   insert into private_website_lab.work_skills(item_id,skill) select i.id,unnest(labels);
  else
   if not lead then raise exception 'Coordinator review is required' using errcode='42501';end if;
   ev:=(payload->>'evidence_id')::uuid;
   if not exists(select 1 from private_website_lab.items where id=ev and team_id=tid and kind='contribution' and url is not null) or length(btrim(coalesce(payload->>'note',''))) not between 20 and 1500 then raise exception 'Choose contribution evidence and explain the accepted outcome (20 to 1500 characters)';end if;
   if action='accept_milestone' then
    select * into i from private_website_lab.items where id=(payload->>'item_id')::uuid and team_id=tid and kind='milestone' for update;
    if i.id is null or t.status<>'active' or i.owner_id is null then raise exception 'Choose an assigned milestone in an active team';end if;
    if i.milestone_accepted_at is null then update private_website_lab.items set status='done',milestone_accepted_at=now(),milestone_accepted_by=actor,milestone_evidence_id=ev,milestone_review_note=btrim(payload->>'note'),updated_at=now() where id=i.id;end if;
   else
    if t.status<>'completed' or not exists(select 1 from private_website_lab.items where team_id=tid and kind='milestone') or exists(select 1 from private_website_lab.items where team_id=tid and ((kind='milestone' and milestone_accepted_at is null) or (kind='task' and status<>'done'))) then raise exception 'Complete the project, accept its milestones and finish its tasks before confirming delivery';end if;
    insert into private_website_lab.deliveries(team_id,evidence_id,confirmed_by,note) values(tid,ev,actor,btrim(payload->>'note')) on conflict(team_id) do nothing;
   end if;
  end if;
  insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,'home_'||action,tid,payload);
  return '{"ok":true}'::jsonb;
 end if;
 raise exception 'Unsupported member home action';
end $$;
revoke all on function private_website_lab.member_home(text,jsonb) from public,anon;
grant execute on function private_website_lab.member_home(text,jsonb) to authenticated;
create function public.website_member_home(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.member_home(p_action,p_payload);$$;
revoke all on function public.website_member_home(text,jsonb) from public,anon;
grant execute on function public.website_member_home(text,jsonb) to authenticated;
commit;
