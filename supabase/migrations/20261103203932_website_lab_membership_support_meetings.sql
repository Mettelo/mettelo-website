begin;
alter table public.website_project_team_members add column admitted_at timestamptz,add column onboarding_checked_at timestamptz,add column external_access_revoked_at timestamptz;
update public.website_project_team_members m set admitted_at=coalesce(m.acknowledged_at,m.joined_at) from public.website_project_teams t where t.id=m.team_id and t.status in ('active','completed') and m.status='confirmed';
create table private_website_lab.placement_restrictions(user_id uuid not null,project_ref text not null,reason text not null,cleared_at timestamptz,created_at timestamptz not null default now(),primary key(user_id,project_ref));
create table private_website_lab.support_cases(id uuid primary key default gen_random_uuid(),team_id uuid not null references public.website_project_teams(id),reporter_id uuid not null references auth.users(id),category text not null check(category in ('scope','access','add_member','remove_member','coordinator','inactive_member','conduct','delivery','meeting','other')),subject text not null check(length(subject) between 5 and 180),description text not null check(length(description) between 20 and 5000),status text not null default 'new' check(status in ('new','in_review','waiting_for_member','resolved','closed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index lab_support_reporter on private_website_lab.support_cases(reporter_id,created_at desc);
create table private_website_lab.support_replies(id uuid primary key default gen_random_uuid(),case_id uuid not null references private_website_lab.support_cases(id),author_id uuid not null references auth.users(id),body text not null check(length(body) between 1 and 5000),internal boolean not null default false,created_at timestamptz not null default now());
create index lab_support_replies_case on private_website_lab.support_replies(case_id,created_at);
create table private_website_lab.meetings(id uuid primary key default gen_random_uuid(),team_id uuid not null references public.website_project_teams(id),organiser_id uuid not null references auth.users(id),client_nonce uuid,topic text not null check(length(topic) between 5 and 180),agenda text not null default '' check(length(agenda)<=3000),starts_at timestamptz not null,ends_at timestamptz not null,time_zone text not null,join_url text not null check(join_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' and length(join_url)<=1000),status text not null default 'scheduled' check(status in ('scheduled','cancelled')),revision integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(organiser_id,client_nonce),check(ends_at>starts_at and ends_at<=starts_at+interval '24 hours'));
create index lab_meetings_team on private_website_lab.meetings(team_id,starts_at);
create table private_website_lab.mail_outbox(id uuid primary key default gen_random_uuid(),meeting_id uuid not null references private_website_lab.meetings(id),revision integer not null,user_id uuid not null references auth.users(id),kind text not null check(kind in ('invitation','updated','cancelled')),state text not null default 'pending' check(state in ('pending','sending','sent','failed','unknown','cancelled','skipped')),attempts integer not null default 0,next_attempt_at timestamptz not null default now(),lease_id uuid,lease_until timestamptz,provider_id text,last_error text,created_at timestamptz not null default now(),unique(meeting_id,revision,user_id));
create index lab_mail_queue on private_website_lab.mail_outbox(state,next_attempt_at);
alter table private_website_lab.placement_restrictions enable row level security;
alter table private_website_lab.support_cases enable row level security;
alter table private_website_lab.support_replies enable row level security;
alter table private_website_lab.meetings enable row level security;
alter table private_website_lab.mail_outbox enable row level security;
revoke all on private_website_lab.placement_restrictions,private_website_lab.support_cases,private_website_lab.support_replies,private_website_lab.meetings,private_website_lab.mail_outbox from public,anon,authenticated;

create function private_website_lab.queue_meeting(mid uuid,recipient uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 update private_website_lab.mail_outbox set state='cancelled' where meeting_id=mid and revision<(select revision from private_website_lab.meetings where id=mid) and state in ('pending','failed');
 insert into private_website_lab.mail_outbox(meeting_id,revision,user_id,kind)
 select e.id,e.revision,m.user_id,case when e.status='cancelled' then 'cancelled' when e.revision>1 then 'updated' else 'invitation' end from private_website_lab.meetings e join public.website_project_team_members m on m.team_id=e.team_id and m.status='confirmed' and m.admitted_at is not null where e.id=mid and (recipient is null or m.user_id=recipient) on conflict do nothing;
end $$;
revoke all on function private_website_lab.queue_meeting(uuid,uuid) from public,anon,authenticated;

do $upgrade$
declare source text;
begin
 source:=pg_get_functiondef('private_website_lab.workspace(text,jsonb)'::regprocedure);
 source:=replace(source,'team_id=tid and user_id=actor and status=''confirmed''','team_id=tid and user_id=actor and status=''confirmed'' and admitted_at is not null');
 source:=replace(source,'where m.team_id=tid and m.status=''confirmed''','where m.team_id=tid and m.status=''confirmed'' and (t.status=''forming'' or m.admitted_at is not null)');execute source;
 source:=pg_get_functiondef('private_website_lab.chat(text,jsonb)'::regprocedure);
 source:=replace(source,'team_id=tid and user_id=actor and status=''confirmed''','team_id=tid and user_id=actor and status=''confirmed'' and admitted_at is not null');
 source:=replace(source,'where m.team_id=tid and m.status=''confirmed''','where m.team_id=tid and m.status=''confirmed'' and m.admitted_at is not null');execute source;
 source:=pg_get_functiondef('private_website_lab.readiness(uuid)'::regprocedure);
 source:=replace(source,'t.two_person_reason is null or not exists','filled<>2 or t.two_person_reason is null or not exists');execute source;
end $upgrade$;

create function private_website_lab.operations(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid:=auth.uid(); admin boolean; member boolean; lead boolean; tid uuid; uid uuid; iid uuid; mid uuid; cid uuid; t public.website_project_teams;m public.website_project_team_members;i public.website_project_interests;c private_website_lab.support_cases;e private_website_lab.meetings;result jsonb;reason text;kind text;target text;filled integer;allow_continue boolean;row jsonb;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 select exists(select 1 from private_website_lab.admins where user_id=actor) into admin;
 tid:=nullif(p_payload->>'team_id','')::uuid;
 if tid is not null then select * into t from public.website_project_teams where id=tid for update;end if;
 select exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status='confirmed' and admitted_at is not null) into member;
 lead:=admin or (member and t.coordinator_id=actor);
 if p_action='formation_list' then
  result:=private_website_lab.admission(p_action,p_payload);
  result:=jsonb_set(result,'{interests}',coalesce((select jsonb_agg(x||jsonb_build_object('restricted',exists(select 1 from private_website_lab.placement_restrictions r where r.user_id=(x->>'user_id')::uuid and r.project_ref=x->>'project_ref' and r.cleared_at is null))) from jsonb_array_elements(result->'interests') x),'[]'));
  result:=jsonb_set(result,'{teams}',coalesce((select jsonb_agg(x||jsonb_build_object('members',coalesce((select jsonb_agg(y||jsonb_build_object('assigned_open_items',(select count(*) from private_website_lab.items a where a.team_id=m.team_id and a.owner_id=m.user_id and a.kind in ('task','milestone') and a.status<>'done'),'admitted',m.admitted_at is not null,'onboarding_checked',m.onboarding_checked_at is not null,'external_access_revoked',m.external_access_revoked_at is not null)) from jsonb_array_elements(x->'members') y join public.website_project_team_members m on m.team_id=(x->>'id')::uuid and m.user_id=(y->>'user_id')::uuid),'[]'))) from jsonb_array_elements(result->'teams') x),'[]'));
  return result||'{"operations_version":1}'::jsonb;
 elsif p_action='mine' then
  result:=private_website_lab.admission(p_action,p_payload);
  return coalesce((select jsonb_agg(x||jsonb_build_object('can_enter',m.admitted_at is not null,'onboarding_pending',m.status='confirmed' and m.admitted_at is null and t.status='active')) from jsonb_array_elements(result) x join public.website_project_team_members m on m.team_id=(x->>'team_id')::uuid and m.user_id=actor join public.website_project_teams t on t.id=m.team_id),'[]');
 elsif p_action in ('support_list','support_case','support_create','support_reply','support_update') then
  if p_action='support_list' then
   return jsonb_build_object('admin',admin,'cases',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'team_id',x.team_id,'team_label',tt.label,'project_ref',tt.project_ref,'category',x.category,'subject',x.subject,'status',x.status,'reporter_name',p.full_name,'created_at',x.created_at) order by x.updated_at desc) from private_website_lab.support_cases x join public.website_project_teams tt on tt.id=x.team_id left join public.profiles p on p.id=x.reporter_id where ((admin and coalesce(p_payload->>'personal','false')<>'true') or x.reporter_id=actor) and (tid is null or x.team_id=tid)),'[]'));
  elsif p_action='support_create' then
   if t.id is null or not (admin or exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status in ('offered','confirmed'))) then raise exception 'A current placement is required to open a team enquiry' using errcode='42501';end if;
   insert into private_website_lab.support_cases(team_id,reporter_id,category,subject,description) values(tid,actor,p_payload->>'category',btrim(p_payload->>'subject'),btrim(p_payload->>'description')) returning id into cid;
  else
   cid:=(p_payload->>'case_id')::uuid;select * into c from private_website_lab.support_cases where id=cid for update;
   if c.id is null or not (admin or c.reporter_id=actor) then raise exception 'Enquiry access required' using errcode='42501';end if;
   if p_action='support_case' then return jsonb_build_object('admin',admin,'case',to_jsonb(c),'replies',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'body',r.body,'internal',r.internal,'created_at',r.created_at,'author',coalesce(p.full_name,'Mettelo support')) order by r.created_at) from private_website_lab.support_replies r left join public.profiles p on p.id=r.author_id where case_id=cid and (admin or not r.internal)),'[]'));end if;
   if p_action='support_update' then
    if not admin then raise exception 'Support administrator required' using errcode='42501';end if;
    update private_website_lab.support_cases set status=p_payload->>'status',updated_at=now() where id=cid;
   else
    if c.status='closed' then raise exception 'This enquiry is closed; ask support to reopen it';end if;
    if p_payload->>'internal'='true' and not admin then raise exception 'Internal notes require support administrator access' using errcode='42501';end if;
    insert into private_website_lab.support_replies(case_id,author_id,body,internal) values(cid,actor,btrim(p_payload->>'body'),admin and coalesce(p_payload->>'internal','false')='true');
    update private_website_lab.support_cases set updated_at=now() where id=cid;
   end if;
  end if;
  insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,coalesce(tid,c.team_id),jsonb_build_object('case_id',cid));
  return jsonb_build_object('ok',true,'case_id',cid);
 elsif p_action in ('meetings','meeting_save','meeting_cancel') then
  if t.id is null or not (admin or member) or (not admin and t.status not in ('active','completed')) then raise exception 'Lab membership required' using errcode='42501';end if;
  if p_action='meetings' then return jsonb_build_object('can_schedule',lead and t.status='active','meetings',coalesce((select jsonb_agg(to_jsonb(x) order by x.starts_at) from private_website_lab.meetings x where team_id=tid),'[]'));end if;
  if not lead or t.status<>'active' then raise exception 'Active project owner/coordinator required' using errcode='42501';end if;
  mid:=nullif(p_payload->>'meeting_id','')::uuid;
  if p_action='meeting_save' and mid is null and nullif(p_payload->>'client_nonce','') is not null then
   select * into e from private_website_lab.meetings where organiser_id=actor and client_nonce=(p_payload->>'client_nonce')::uuid;
   if e.id is not null then
    if e.team_id<>tid or e.topic<>btrim(p_payload->>'topic') or e.starts_at<>(p_payload->>'starts_at')::timestamptz or e.ends_at<>(p_payload->>'ends_at')::timestamptz or e.join_url<>p_payload->>'join_url' or e.agenda<>coalesce(p_payload->>'agenda','') then raise exception 'This save token already belongs to another meeting change; reload the form';end if;
    return jsonb_build_object('ok',true,'meeting_id',e.id,'already_saved',true);
   end if;
  end if;
  if mid is not null then select * into e from private_website_lab.meetings where id=mid and team_id=tid for update;if e.id is null then raise exception 'Meeting not found';end if;
   if (p_payload->>'expected_revision')::integer is distinct from e.revision then raise exception 'Meeting changed; reload before editing';end if;
  end if;
  if p_action='meeting_cancel' then
   if e.id is null or e.status<>'scheduled' then raise exception 'Select a scheduled meeting';end if;
   update private_website_lab.meetings set status='cancelled',revision=revision+1,updated_at=now() where id=mid;
  else
   if (p_payload->>'starts_at')::timestamptz<=now() then raise exception 'Choose a future meeting time';end if;
   if not exists(select 1 from pg_timezone_names where name=p_payload->>'time_zone') then raise exception 'Choose a recognised time zone';end if;
   if e.id is not null and e.status='cancelled' then raise exception 'Create a new meeting instead of editing a cancellation';end if;
   if mid is null then
    insert into private_website_lab.meetings(team_id,organiser_id,client_nonce,topic,agenda,starts_at,ends_at,time_zone,join_url) values(tid,actor,nullif(p_payload->>'client_nonce','')::uuid,btrim(p_payload->>'topic'),coalesce(p_payload->>'agenda',''),(p_payload->>'starts_at')::timestamptz,(p_payload->>'ends_at')::timestamptz,p_payload->>'time_zone',p_payload->>'join_url') returning id into mid;
   else update private_website_lab.meetings set topic=btrim(p_payload->>'topic'),agenda=coalesce(p_payload->>'agenda',''),starts_at=(p_payload->>'starts_at')::timestamptz,ends_at=(p_payload->>'ends_at')::timestamptz,time_zone=p_payload->>'time_zone',join_url=p_payload->>'join_url',revision=revision+1,updated_at=now() where id=mid;end if;
  end if;
  perform private_website_lab.queue_meeting(mid);
  insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,tid,jsonb_build_object('meeting_id',mid));return jsonb_build_object('ok',true,'meeting_id',mid);
 elsif p_action='outbox_list' then
  if not admin then raise exception 'Support administrator required' using errcode='42501';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'topic',e.topic,'team',tt.label,'recipient',p.full_name,'kind',o.kind,'state',o.state,'attempts',o.attempts,'last_error',o.last_error,'created_at',o.created_at) order by o.created_at desc) from private_website_lab.mail_outbox o join private_website_lab.meetings e on e.id=o.meeting_id join public.website_project_teams tt on tt.id=e.team_id left join public.profiles p on p.id=o.user_id),'[]');
 elsif p_action='outbox_retry' then
  if not admin then raise exception 'Support administrator required' using errcode='42501';end if;
  update private_website_lab.mail_outbox set state='pending',attempts=0,next_attempt_at=now(),last_error=null where id=(p_payload->>'job_id')::uuid and state='failed';
  if not found then raise exception 'Only a confirmed failed delivery can retry; unknown deliveries require provider reconciliation';end if;
  return '{"ok":true}';
 end if;
 if not admin and p_action in ('offer','release_member','clear_restriction','admit_member','form_group','external_access_review') then raise exception 'Project administrator required' using errcode='42501';end if;
 if p_action='offer' then
  select * into i from public.website_project_interests where id=(p_payload->>'interest_id')::uuid;
  if t.id is null or t.status not in ('forming','active','paused') or i.project_ref is distinct from t.project_ref or not exists(select 1 from private_website_lab.interest_reviews where interest_id=i.id and status='shortlisted') or i.answers->>'commitment_response'='no' or i.participation not in (t.participation,'flexible') then raise exception 'Choose a shortlisted applicant matching this placement';end if;
  if exists(select 1 from private_website_lab.placement_restrictions where user_id=i.user_id and project_ref=t.project_ref and cleared_at is null) then raise exception 'This applicant needs restriction review before a new offer';end if;
  if t.status='paused' then update public.website_project_teams set status='forming',accepting_members=true where id=tid;end if;
  insert into public.website_project_team_members(team_id,interest_id,user_id,project_ref,role,status,offer_expires_at) values(tid,i.id,i.user_id,t.project_ref,p_payload->>'role','offered',now()+interval '7 days') on conflict(team_id,user_id) do update set role=excluded.role,status='offered',offer_expires_at=excluded.offer_expires_at,acknowledged_at=null,access_verified_at=null,access_verified_by=null,commitment_confirmed_at=null,two_person_agreed_at=null,admitted_at=null,onboarding_checked_at=null,external_access_revoked_at=null where website_project_team_members.status in ('declined','left');
  if not found then raise exception 'This member already has a current placement';end if;
 elsif p_action='admit_member' then
  uid:=(p_payload->>'user_id')::uuid;select * into m from public.website_project_team_members where team_id=tid and user_id=uid for update;
  if t.status<>'active' or m.status<>'confirmed' or m.access_verified_at is null or m.commitment_confirmed_at is null or p_payload->>'onboarding_confirmed' is distinct from 'true' then raise exception 'Accepted place, commitment, repository check and onboarding are required';end if;
  if m.admitted_at is not null then return '{"ok":true,"already_admitted":true}';end if;
  update public.website_project_team_members set admitted_at=now(),onboarding_checked_at=now() where team_id=tid and user_id=uid;
  for mid in select id from private_website_lab.meetings where team_id=tid and status='scheduled' and starts_at>now() loop perform private_website_lab.queue_meeting(mid,uid);end loop;
 elsif p_action='release_member' then
  uid:=(p_payload->>'user_id')::uuid;reason:=btrim(coalesce(p_payload->>'reason',''));kind:=p_payload->>'release_reason';
  if kind not in ('withdrawal','inactive','role_change','restructure','conduct','other') or kind is null or length(reason) not between 8 and 500 then raise exception 'Choose a removal reason and explanation';end if;
  select * into m from public.website_project_team_members where team_id=tid and user_id=uid for update;
  if t.status='completed' or m.user_id is null or m.status not in ('offered','confirmed') then raise exception 'Choose a current placement';end if;
  -- Release first through the existing audited authority, which conservatively pauses an active team.
  if m.status='offered' then update public.website_project_team_members set status='declined' where team_id=tid and user_id=uid;
  else result:=private_website_lab.admission('release_member',p_payload);end if;
  update public.website_project_team_members set admitted_at=null,onboarding_checked_at=null where team_id=tid and user_id=uid;
  update private_website_lab.mail_outbox set state='cancelled' where user_id=uid and state in ('pending','failed') and meeting_id in (select id from private_website_lab.meetings where team_id=tid);
  if kind in ('conduct','withdrawal') then insert into private_website_lab.placement_restrictions(user_id,project_ref,reason) values(uid,t.project_ref,reason) on conflict(user_id,project_ref) do update set reason=excluded.reason,cleared_at=null,created_at=now();end if;
  select count(*) into filled from public.website_project_team_members where team_id=tid and status='confirmed' and admitted_at is not null;
  if m.admitted_at is not null and filled<=2 then
   update public.website_project_teams set two_person_reason=null,two_person_approved_at=null,two_person_approved_by=null where id=tid;
   update public.website_project_team_members set two_person_agreed_at=null where team_id=tid and status='confirmed';
  end if;
  -- Keep delivery active only after an explicit administrator review and with no orphaned open work.
  allow_continue:=t.status='active' and p_payload->>'keep_active'='true' and (filled>=3 or (t.participation='solo' and filled=1)) and t.coordinator_id is distinct from uid and not exists(select 1 from private_website_lab.items where team_id=tid and owner_id=uid and kind in ('task','milestone') and status<>'done');
  if allow_continue then
   result:=private_website_lab.readiness(tid);
   if result->>'ready'='true' then update public.website_project_teams set status='active' where id=tid;end if;
  end if;
 elsif p_action='external_access_review' then
  uid:=(p_payload->>'user_id')::uuid;
  if p_payload->>'external_access_confirmed' is distinct from 'true' then raise exception 'Confirm external access has actually been revoked';end if;
  update public.website_project_team_members set external_access_revoked_at=now() where team_id=tid and user_id=uid and status in ('left','declined');
  if not found then raise exception 'Choose a released placement';end if;
 elsif p_action='clear_restriction' then
  reason:=btrim(coalesce(p_payload->>'reason',''));if length(reason) not between 8 and 500 then raise exception 'Record the clearance decision';end if;
  update private_website_lab.placement_restrictions set cleared_at=now() where user_id=(p_payload->>'user_id')::uuid and project_ref=p_payload->>'project_ref';
 elsif p_action='start' then
  result:=private_website_lab.admission('start',p_payload);
  update public.website_project_team_members set admitted_at=coalesce(admitted_at,now()),onboarding_checked_at=coalesce(onboarding_checked_at,now()) where team_id=tid and status='confirmed';
 elsif p_action='form_group' then
  if exists(select 1 from jsonb_array_elements(p_payload->'members') x join public.website_project_interests i on i.id=(x->>'interest_id')::uuid join private_website_lab.placement_restrictions r on r.user_id=i.user_id and r.project_ref=i.project_ref and r.cleared_at is null) then raise exception 'Review the placement restriction before forming';end if;
  return private_website_lab.admission(p_action,p_payload);
 else
  if p_action in ('add_item','assign_item') and nullif(p_payload->>'owner_id','') is not null then
   if p_action='assign_item' then select team_id into tid from private_website_lab.items where id=(p_payload->>'item_id')::uuid;select * into t from public.website_project_teams where id=tid;end if;
   if t.status='active' and not exists(select 1 from public.website_project_team_members where team_id=tid and user_id=(p_payload->>'owner_id')::uuid and status='confirmed' and admitted_at is not null) then raise exception 'Assign active work only to an admitted member';end if;
  end if;
  if p_action='agree_two' then return private_website_lab.agree_two(tid);end if;
  if p_action in ('chat_snapshot','discussion','discussion_edit','discussion_delete','discussion_pin','discussion_classify','chat_link') then return private_website_lab.chat(p_action,p_payload);end if;
  if p_action in ('workspace','prepare_workspace','task_status','task_history','add_item','assign_item') then return private_website_lab.workspace(p_action,p_payload);end if;
  return private_website_lab.admission(p_action,p_payload);
 end if;
 insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,p_action,tid,p_payload);
 return jsonb_build_object('ok',true,'team_id',tid);
end $$;
revoke all on function private_website_lab.operations(text,jsonb) from public,anon;
grant execute on function private_website_lab.operations(text,jsonb) to authenticated;
revoke execute on function private_website_lab.admission(text,jsonb) from authenticated;
revoke execute on function private_website_lab.workspace(text,jsonb),private_website_lab.chat(text,jsonb),private_website_lab.agree_two(uuid) from authenticated;
create or replace function public.website_lab(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.operations(p_action,p_payload)$$;
commit;
