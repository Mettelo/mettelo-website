begin;
create table private_website_lab.member_access(
 user_id uuid primary key references auth.users(id) on delete cascade,
 suspended boolean not null default false,version bigint not null default 1,
 reason text not null check(length(btrim(reason)) between 8 and 500),changed_by uuid not null references auth.users(id),changed_at timestamptz not null default now());
create table private_website_lab.member_access_audit(
 id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid not null references auth.users(id),action text not null check(action in ('suspend','restore')),
 reason text not null,created_at timestamptz not null default now());
alter table private_website_lab.member_access enable row level security;
alter table private_website_lab.member_access_audit enable row level security;
revoke all on private_website_lab.member_access,private_website_lab.member_access_audit from public,anon,authenticated;

create function private_website_lab.account_allowed(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=uid and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and not exists(select 1 from private_website_lab.member_access a where a.user_id=uid and a.suspended))
$$;
revoke all on function private_website_lab.account_allowed(uuid) from public,anon,authenticated;
create function public.website_account_allowed() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and private_website_lab.account_allowed(auth.uid())$$;
revoke all on function public.website_account_allowed() from public,anon,authenticated;
grant execute on function public.website_account_allowed() to authenticated;
create function public.website_account_access() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('allowed',public.website_account_allowed())
$$;
revoke all on function public.website_account_access() from public,anon,authenticated;
grant execute on function public.website_account_access() to authenticated;

-- This hook has no data-returning branch. Only the caller's own access check is exempt.
create function public.website_request_guard() returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then return;end if;
 if ltrim(coalesce(current_setting('request.path',true),''),'/')='rpc/website_account_access' then return;end if;
 if not public.website_account_allowed() then raise exception 'Website access is paused. Contact Mettelo Support.' using errcode='42501',detail='WEBSITE_ACCESS_PAUSED';end if;
end $$;
revoke all on function public.website_request_guard() from public,anon,authenticated;
grant execute on function public.website_request_guard() to anon,authenticated,service_role;
do $$begin
 if exists(select 1 from pg_roles r,unnest(r.rolconfig) c where r.rolname='authenticator' and c like 'pgrst.db_pre_request=%' and c<>'pgrst.db_pre_request=public.website_request_guard') then raise exception 'An existing request guard must be preserved and integrated';end if;
end $$;
alter role authenticator set pgrst.db_pre_request='public.website_request_guard';
notify pgrst,'reload config';
-- Storage and future profile subscriptions also check current access (not JWT freshness).
create policy website_active_photo_access on storage.objects as restrictive for all to authenticated
 using(bucket_id<>'website-profile-photos' or (select public.website_account_allowed()))
 with check(bucket_id<>'website-profile-photos' or (select public.website_account_allowed()));
create policy website_active_profile_access on public.profiles as restrictive for all to authenticated
 using((select public.website_account_allowed())) with check((select public.website_account_allowed()));

create function private_website_lab.manage_members(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; expected bigint; current_version bigint; target_email text;
 query_text text; status_filter text; pg integer; total integer; rows jsonb; details jsonb; suspended_now boolean;
 requested boolean; why text; protected boolean;
begin
 if actor is null or not private_website_lab.account_allowed(actor) or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not exists(select 1 from private_website_lab.admins where user_id=actor) then raise exception 'Member administrator access required' using errcode='42501';end if;
 if p_action='list' then
  query_text:=left(btrim(coalesce(p_payload->>'q','')),100);status_filter:=coalesce(p_payload->>'status','all');pg:=greatest(1,least(100000,coalesce((p_payload->>'page')::integer,1)));
  if status_filter not in ('all','active','suspended','unverified') then raise exception 'Invalid member filter';end if;
  with matches as(select u.id from auth.users u left join public.profiles p on p.id=u.id left join private_website_lab.member_access a on a.user_id=u.id
   where u.deleted_at is null and (query_text='' or strpos(lower(coalesce(u.email,'')||' '||coalesce(p.full_name,'')||' '||coalesce(p.username,'')),lower(query_text))>0)
   and (status_filter='all' or (status_filter='suspended' and coalesce(a.suspended,false)) or (status_filter='active' and u.email_confirmed_at is not null and not coalesce(a.suspended,false) and (u.banned_until is null or u.banned_until<=now())) or (status_filter='unverified' and u.email_confirmed_at is null))) select count(*) into total from matches;
  pg:=least(pg,greatest(1,ceil(total/20.0)::integer));
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]') into rows from (
   select u.id,u.email,coalesce(p.full_name,'Member') name,p.username,u.created_at,u.last_sign_in_at,u.email_confirmed_at is not null verified,
   coalesce(a.suspended,false) suspended,coalesce(a.version,0) version,(u.banned_until>now()) auth_restricted,
   (u.id=actor or exists(select 1 from private_website_lab.admins where user_id=u.id) or exists(select 1 from private_opportunity_pipeline.admins where user_id=u.id)) protected,
   (select count(*) from public.website_project_interests i where i.user_id=u.id) applications,
   (select count(*) from public.website_project_team_members m join public.website_project_teams t on t.id=m.team_id where m.user_id=u.id and m.status='confirmed' and t.status='active') active_projects
   from auth.users u left join public.profiles p on p.id=u.id left join private_website_lab.member_access a on a.user_id=u.id
   where u.deleted_at is null and (query_text='' or strpos(lower(coalesce(u.email,'')||' '||coalesce(p.full_name,'')||' '||coalesce(p.username,'')),lower(query_text))>0)
   and (status_filter='all' or (status_filter='suspended' and coalesce(a.suspended,false)) or (status_filter='active' and u.email_confirmed_at is not null and not coalesce(a.suspended,false) and (u.banned_until is null or u.banned_until<=now())) or (status_filter='unverified' and u.email_confirmed_at is null))
   order by u.created_at desc,u.id limit 20 offset (pg-1)*20
  )x;
  return jsonb_build_object('members',rows,'total',total,'page',pg,'pages',greatest(1,ceil(total/20.0)::integer),'overview',jsonb_build_object(
   'members',(select count(*) from auth.users where deleted_at is null),
   'verified',(select count(*) from auth.users where deleted_at is null and email_confirmed_at is not null),
   'active_projects',(select count(distinct project_ref) from public.website_project_teams where status='active'),
   'active_teams',(select count(*) from public.website_project_teams where status='active'),
   'awaiting_review',(select count(*) from public.website_project_interests i left join private_website_lab.interest_reviews r on r.interest_id=i.id where coalesce(r.status,'new')='new' and not exists(select 1 from public.website_project_team_members m where m.interest_id=i.id and m.status in ('offered','confirmed'))),
   'open_enquiries',(select count(*) from private_website_lab.support_cases where status not in ('resolved','closed'))+(select count(*) from private_website_lab.public_contacts where status not in ('resolved','closed'))
  ));
 end if;
 target:=(p_payload->>'user_id')::uuid;
 select u.email into target_email from auth.users u where u.id=target and u.deleted_at is null for update;
 if not found then raise exception 'Member not found';end if;
 select coalesce(a.version,0),coalesce(a.suspended,false) into current_version,suspended_now from private_website_lab.member_access a where a.user_id=target;
 current_version:=coalesce(current_version,0);suspended_now:=coalesce(suspended_now,false);
 protected:=target=actor or exists(select 1 from private_website_lab.admins where user_id=target) or exists(select 1 from private_opportunity_pipeline.admins where user_id=target);
 if p_action='detail' then
  return jsonb_build_object('user_id',target,'email',target_email,'protected',protected,'suspended',suspended_now,'version',current_version,
   'last_reason',(select reason from private_website_lab.member_access where user_id=target),
   'profile',(select jsonb_build_object('headline',p.headline,'professional_area',p.professional_area,'location',p.location,'current_job_title',p.current_job_title,'experience_level',p.experience_level) from public.profiles p where p.id=target),
   'enquiries',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from (
    select * from (select c.id,c.subject,c.status,c.updated_at,'member'::text source from private_website_lab.support_cases c where c.reporter_id=target
    union all select c.id,c.subject,c.status,c.updated_at,'public'::text source from private_website_lab.public_contacts c where lower(c.email)=lower(target_email))e order by updated_at desc limit 10)x),'[]'),
   'placements',coalesce((select jsonb_agg(jsonb_build_object('team_id',t.id,'label',t.label,'project_ref',t.project_ref,'team_status',t.status,'membership_status',m.status,'role',m.role,'coordinator',t.coordinator_id=target) order by t.created_at desc) from public.website_project_team_members m join public.website_project_teams t on t.id=m.team_id where m.user_id=target),'[]'),
   'applications',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'project_ref',i.project_ref,'status',coalesce(r.status,'new')) order by i.submitted_at desc) from public.website_project_interests i left join private_website_lab.interest_reviews r on r.interest_id=i.id where i.user_id=target),'[]'),
   'audit',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select action,reason,created_at from private_website_lab.member_access_audit where user_id=target order by created_at desc,id desc limit 10)x),'[]'));
 end if;
 if p_action not in ('suspend','restore') or p_action is null then raise exception 'Unsupported member action';end if;
 if protected then raise exception 'Administrator accounts are protected from this control' using errcode='42501';end if;
 expected:=(p_payload->>'version')::bigint;if expected is null or expected<>current_version then raise exception 'Member access changed. Refresh before continuing';end if;
 why:=btrim(coalesce(p_payload->>'reason',''));if length(why) not between 8 and 500 then raise exception 'Record a reason between 8 and 500 characters';end if;
 if lower(btrim(coalesce(p_payload->>'confirmation','')))<>lower(target_email) then raise exception 'Type the member email to confirm';end if;
 requested:=p_action='suspend';if requested=suspended_now then return jsonb_build_object('ok',true,'unchanged',true);end if;
 insert into private_website_lab.member_access(user_id,suspended,reason,changed_by) values(target,requested,why,actor)
 on conflict(user_id) do update set suspended=excluded.suspended,reason=excluded.reason,version=private_website_lab.member_access.version+1,changed_by=actor,changed_at=now();
 insert into private_website_lab.member_access_audit(user_id,actor_id,action,reason) values(target,actor,p_action,why);
 return jsonb_build_object('ok',true);
end $$;
revoke all on function private_website_lab.manage_members(text,jsonb) from public,anon,authenticated;
grant execute on function private_website_lab.manage_members(text,jsonb) to authenticated;
create function public.website_manage_members(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.manage_members(p_action,p_payload)$$;
revoke all on function public.website_manage_members(text,jsonb) from public,anon,authenticated;
grant execute on function public.website_manage_members(text,jsonb) to authenticated;
-- Keep server-only mail preparation and meeting delivery eligibility aligned with website suspension.
do $guard_mail$
declare body text;
begin
 body:=pg_get_functiondef('private_website_lab.weekly_pulse(text,timestamptz)'::regprocedure);
 if strpos(body,'and (u.banned_until is null or u.banned_until<=p_now)')=0 then raise exception 'Unexpected weekly pulse definition';end if;
 body:=replace(body,'and (u.banned_until is null or u.banned_until<=p_now)','and (u.banned_until is null or u.banned_until<=p_now) and private_website_lab.account_allowed(u.id)');execute body;
 body:=pg_get_functiondef('private_website_lab.project_email_preview(integer)'::regprocedure);
 if strpos(body,'and (u.banned_until is null or u.banned_until<=now())')=0 then raise exception 'Unexpected email preview definition';end if;
 body:=replace(body,'and (u.banned_until is null or u.banned_until<=now())','and (u.banned_until is null or u.banned_until<=now()) and private_website_lab.account_allowed(u.id)');execute body;
 body:=pg_get_functiondef('private_website_lab.mail_worker(text,jsonb)'::regprocedure);
 if strpos(body,'ready:=e.revision=job.revision')=0 or strpos(body,'if e.revision<>job.revision')=0 then raise exception 'Unexpected meeting worker definition';end if;
 body:=replace(body,'ready:=e.revision=job.revision','ready:=private_website_lab.account_allowed(job.user_id) and e.revision=job.revision');
 body:=replace(body,'if e.revision<>job.revision','if not private_website_lab.account_allowed(job.user_id) or e.revision<>job.revision');execute body;
end $guard_mail$;

notify pgrst,'reload schema';
commit;
