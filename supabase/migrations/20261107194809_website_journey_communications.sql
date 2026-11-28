-- Future events only. Delivery is explicitly gated, staging-only and administrator-only.
begin;
create table private_website_lab.journey_mail_settings(
 id boolean primary key default true check(id), capture_enabled boolean not null default true,
 enabled_at timestamptz not null default clock_timestamp()
);
insert into private_website_lab.journey_mail_settings(id) values(true);
create table private_website_lab.journey_mail(
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references auth.users(id),
 project_event_id bigint unique references private_website_lab.project_email_previews(id) on delete cascade,
 notification_id uuid unique references private_website_lab.notifications(id) on delete cascade,
 kind text not null, created_at timestamptz not null default clock_timestamp(),
 state text not null default 'pending' check(state in ('pending','sending','sent','failed','unknown','skipped')),
 lease_id uuid, lease_until timestamptz, attempts integer not null default 0,
 provider_id text, last_error text, next_attempt_at timestamptz not null default now(),
 check(num_nonnulls(project_event_id,notification_id)=1)
);
alter table private_website_lab.journey_mail_settings enable row level security;
alter table private_website_lab.journey_mail enable row level security;
revoke all on private_website_lab.journey_mail_settings,private_website_lab.journey_mail from public,anon,authenticated;
create index journey_mail_pending on private_website_lab.journey_mail(recipient_id,created_at) where state in ('pending','failed','sending');

create function private_website_lab.capture_journey_mail() returns trigger language plpgsql security definer set search_path='' as $$
declare k text; since timestamptz;
begin
 select enabled_at into since from private_website_lab.journey_mail_settings where id and capture_enabled;
 if since is null or new.created_at<since then return new;end if;
 if tg_table_name='project_email_previews' then
  insert into private_website_lab.journey_mail(recipient_id,project_event_id,kind) values(new.recipient_id,new.id,new.kind) on conflict do nothing;
 else
  k:=case split_part(new.event_key,':',1)
   when 'support' then 'support_reply' when 'nomination' then 'coordinator_nomination'
   when 'market-request' then 'collaboration_request' when 'market-decision' then 'collaboration_decision'
   when 'market-leader-decision' then 'collaboration_decision' when 'market-removed' then 'collaboration_removed'
   when 'market-proposal' then 'proposal_decision' when 'email-test' then 'delivery_test' end;
  if split_part(new.event_key,':',1)='team' and split_part(new.event_key,':',3) in ('paused','completed') then k:='lab_status';end if;
  if split_part(new.event_key,':',1)='placement' and split_part(new.event_key,':',3)='left' then k:='placement_ended';end if;
  if k is not null then insert into private_website_lab.journey_mail(recipient_id,notification_id,kind) values(new.recipient_id,new.id,k) on conflict do nothing;end if;
 end if;
 return new;
end $$;
revoke all on function private_website_lab.capture_journey_mail() from public,anon,authenticated;
create trigger journey_project_mail after insert on private_website_lab.project_email_previews for each row execute function private_website_lab.capture_journey_mail();
create trigger journey_notice_mail after insert on private_website_lab.notifications for each row execute function private_website_lab.capture_journey_mail();

-- Reuse the current authoritative projection, narrowed by event ID instead of a page.
do $upgrade$ declare src text;begin
 src:=pg_get_functiondef('private_website_lab.project_email_preview(integer)'::regprocedure);
 if position('WHERE' in upper(src))=0 or position('order by q.id limit least(200,greatest(1,coalesce(p_limit,100)))' in src)=0 then raise exception 'Project email projection changed; review required';end if;
 src:=replace(src,'project_email_preview(p_limit integer DEFAULT 100)','journey_project_event(p_event_id bigint)');
 src:=replace(src,'where u.email_confirmed_at','where q.id=p_event_id and u.email_confirmed_at');
 src:=replace(src,'order by q.id limit least(200,greatest(1,coalesce(p_limit,100)))','order by q.id');
 execute src;
end $upgrade$;
revoke all on function private_website_lab.journey_project_event(bigint) from public,anon,authenticated;

create function private_website_lab.journey_mail_payload(job_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare j private_website_lab.journey_mail; n private_website_lab.notifications; p jsonb; target uuid; subject text; href text; r private_website_lab.market_requests; t public.website_project_teams;
begin
 select * into j from private_website_lab.journey_mail where id=job_id;
 if j.id is null or j.created_at<now()-interval '72 hours' or not private_website_lab.account_allowed(j.recipient_id)
 or not exists(select 1 from auth.users where id=j.recipient_id and email_confirmed_at is not null and deleted_at is null and email is not null and (banned_until is null or banned_until<=now())) then return null;end if;
 if j.project_event_id is not null then
  p:=private_website_lab.journey_project_event(j.project_event_id)->0;
  if p is null then return null;end if;
  if j.kind='offer_ready' then
   p:=p||jsonb_build_object('coordinator_nomination',exists(select 1 from public.website_project_teams where id=(p->>'team_id')::uuid and coordinator_nominee_id=j.recipient_id));
  end if;
  return p||jsonb_build_object('id',j.id,'kind',j.kind);
 end if;
 select * into n from private_website_lab.notifications where id=j.notification_id and recipient_id=j.recipient_id;
 if n.id is null then return null;end if;
 target:=split_part(n.event_key,':',2)::uuid;
 if j.kind='delivery_test' then
  if split_part(n.event_key,':',1)<>'email-test' or not private_website_lab.permitted(j.recipient_id,'operations') then return null;end if;
 elsif j.kind='support_reply' then
  if not exists(select 1 from private_website_lab.support_replies a join private_website_lab.support_cases c on c.id=a.case_id where a.id=target and not a.internal and c.reporter_id=j.recipient_id and a.author_id<>j.recipient_id) then return null;end if;
 elsif j.kind='coordinator_nomination' then
  select * into t from public.website_project_teams where id=target and coordinator_nominee_id=j.recipient_id and status in ('forming','active');
  if t.id is null then return null;end if;
  -- A nomination made together with an offer is included in that offer email.
  if exists(select 1 from private_website_lab.journey_mail q join private_website_lab.project_email_previews e on e.id=q.project_event_id where q.recipient_id=j.recipient_id and q.kind='offer_ready' and e.team_id=target and abs(extract(epoch from q.created_at-j.created_at))<5) then return null;end if;
 elsif j.kind in ('collaboration_request','collaboration_decision') then
  select * into r from private_website_lab.market_requests where id=target;
  select * into t from public.website_project_teams where id=r.team_id;
  if r.id is null or t.id is null or not private_website_lab.account_allowed(t.coordinator_id) or private_website_lab.market_blocked(r.member_id,t.coordinator_id)
   or not (j.recipient_id=r.member_id or j.recipient_id=t.coordinator_id) then return null;end if;
  if j.kind='collaboration_request' then
   if r.state<>'pending' or r.expires_at<=now() or t.status<>'active' or not t.lab_enabled or not private_website_lab.market_leader(t.id,t.coordinator_id)
    or (r.kind='invitation' and (j.recipient_id<>r.member_id or r.initiated_by<>t.coordinator_id)) or (r.kind='request' and j.recipient_id<>t.coordinator_id) then return null;end if;
  else
   if r.state<>split_part(n.event_key,':',3) or r.state='pending' then return null;end if;
   if r.state='accepted' and not exists(select 1 from public.website_project_team_members m where m.team_id=r.team_id and m.user_id=r.member_id and m.status='confirmed' and m.admitted_at is not null and m.external_access_revoked_at is null and t.status='active' and t.lab_enabled) then return null;end if;
  end if;
 elsif j.kind='collaboration_removed' then
  if exists(select 1 from public.website_project_team_members where team_id=target and user_id=j.recipient_id and status='confirmed') then return null;end if;
 elsif j.kind='proposal_decision' then
  if not exists(select 1 from private_website_lab.market_proposals where id=target and owner_id=j.recipient_id and state in ('approved','changes_requested','rejected') and version::text=split_part(n.event_key,':',3)) then return null;end if;
 elsif j.kind='lab_status' then
  if not exists(select 1 from public.website_project_teams t join public.website_project_team_members m on m.team_id=t.id where t.id=target and t.status=split_part(n.event_key,':',3) and m.user_id=j.recipient_id and m.status='confirmed' and m.admitted_at is not null and m.external_access_revoked_at is null) then return null;end if;
 elsif j.kind='placement_ended' then
  if not exists(select 1 from public.website_project_team_members where team_id=target and user_id=j.recipient_id and status='left' and admission_route='core') then return null;end if;
 else return null;end if;
 return jsonb_build_object('id',j.id,'kind',j.kind,'recipient_id',j.recipient_id,'email',(select email from auth.users where id=j.recipient_id),'title',n.title,'href',n.href);
end $$;
revoke all on function private_website_lab.journey_mail_payload(uuid) from public,anon,authenticated;

-- This initial worker can only deliver to the explicitly chosen, currently verified admin.
-- Ordinary members cannot claim mail; production sending is not introduced here.
create function private_website_lab.journey_mail_worker(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); recipient uuid; j private_website_lab.journey_mail; result jsonb;
begin
 recipient:=coalesce(actor,(payload->>'admin_id')::uuid);
 if recipient is null or not private_website_lab.permitted(recipient,'operations') or not private_website_lab.account_allowed(recipient)
 or not exists(select 1 from auth.users where id=recipient and email_confirmed_at is not null and deleted_at is null) then raise exception 'Verified operations administrator required' using errcode='42501';end if;
 if actor is null and coalesce(auth.role(),'')<>'service_role' then raise exception 'Server worker identity required' using errcode='42501';end if;
 if action='status' then return jsonb_build_object('admin_only',true,'states',(select coalesce(jsonb_object_agg(state,n),'{}') from(select state,count(*) n from private_website_lab.journey_mail where recipient_id=recipient group by state)x));end if;
 if action='test' then
  perform private_website_lab.notify_member(recipient,'email-test:'||(payload->>'nonce')::uuid,'Staging email delivery test','/member');
  return '{"ok":true}';
 end if;
 if action='claim' then
  update private_website_lab.journey_mail set state='unknown',lease_until=null,last_error='Expired lease; reconcile with provider before retrying.' where recipient_id=recipient and state='sending' and lease_until<now();
  select * into j from private_website_lab.journey_mail where recipient_id=recipient and state in ('pending','failed') and attempts<3 and next_attempt_at<=now() order by created_at,id for update skip locked limit 1;
  if j.id is null then return null;end if;
  if private_website_lab.journey_mail_payload(j.id) is null then update private_website_lab.journey_mail set state='skipped' where id=j.id;return '{"skipped":true}';end if;
  update private_website_lab.journey_mail set state='sending',lease_id=gen_random_uuid(),lease_until=now()+interval '3 minutes',attempts=attempts+1 where id=j.id returning * into j;
  return jsonb_build_object('id',j.id,'lease_id',j.lease_id);
 elsif action in ('prepare','complete') then
  select * into j from private_website_lab.journey_mail where id=(payload->>'job_id')::uuid and recipient_id=recipient and lease_id=(payload->>'lease_id')::uuid and state='sending' and lease_until>now() for update;
  if j.id is null then raise exception 'Current delivery lease required';end if;
  if action='prepare' then
   result:=private_website_lab.journey_mail_payload(j.id);
   if result is null then update private_website_lab.journey_mail set state='skipped',lease_until=null where id=j.id;return '{"skipped":true}';end if;
   return result;
  end if;
  if payload->>'state' not in ('sent','failed','unknown','skipped') or (payload->>'state'='sent' and nullif(payload->>'provider_id','') is null) then raise exception 'Valid delivery outcome required';end if;
  update private_website_lab.journey_mail set state=payload->>'state',provider_id=left(payload->>'provider_id',150),last_error=left(payload->>'error',200),lease_until=null,next_attempt_at=now()+interval '5 minutes' where id=j.id;
  return '{"ok":true}';
 end if;
 raise exception 'Unsupported delivery action';
end $$;
revoke all on function private_website_lab.journey_mail_worker(text,jsonb) from public,anon;
grant execute on function private_website_lab.journey_mail_worker(text,jsonb) to authenticated,service_role;
create function public.website_journey_mail_worker(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.journey_mail_worker(p_action,p_payload)$$;
revoke all on function public.website_journey_mail_worker(text,jsonb) from public,anon;
grant execute on function public.website_journey_mail_worker(text,jsonb) to authenticated,service_role;

-- Do not label a forming or paused Lab as ready merely because admission was recorded.
do $upgrade$ declare src text;begin
 src:=pg_get_functiondef('private_website_lab.member_event()'::regprocedure);
 src:=replace(src,'when new.status=''confirmed'' and new.admitted_at is not null then ''Your Lab access is ready''','when new.status=''confirmed'' and new.admitted_at is not null and new.external_access_revoked_at is null and exists(select 1 from public.website_project_teams t where t.id=new.team_id and t.status=''active'' and t.lab_enabled) then ''Your Lab access is ready''');
 execute src;
end $upgrade$;
notify pgrst,'reload schema';
commit;
