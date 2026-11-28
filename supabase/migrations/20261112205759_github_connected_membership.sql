-- Verified provider identities stay separate from Mettelo usernames and editable profile URLs.
create schema private_website_github;
revoke all on schema private_website_github from public,anon,authenticated;
grant usage on schema private_website_github to authenticated,service_role;
create table private_website_github.policy(id boolean primary key default true check(id),required_for_projects boolean not null default false,updated_at timestamptz not null default now(),updated_by uuid);
insert into private_website_github.policy(id) values(true);
create table private_website_github.connections(
 user_id uuid primary key references auth.users(id) on delete cascade,identity_id uuid not null,
 github_id bigint not null unique check(github_id>0),login text not null check(login ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,38}$'),
 org_status text not null default 'not_invited' check(org_status in ('not_invited','pending','member','setup_required','failed','unknown')),
 invitation_id bigint,checked_at timestamptz,attempted_at timestamptz,lease uuid,lease_until timestamptz,last_error text,
 connected_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table private_website_github.policy enable row level security;
alter table private_website_github.connections enable row level security;
revoke all on all tables in schema private_website_github from public,anon,authenticated;

create function private_website_github.connected(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.identities i where i.user_id=uid and i.provider='github' and i.provider_id ~ '^[1-9][0-9]{0,18}$')
$$;
create function private_website_github.lab_ready(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not (select required_for_projects from private_website_github.policy where id) or exists(select 1 from private_website_github.connections c join auth.identities i on i.id=c.identity_id and i.user_id=c.user_id and i.provider='github' and i.provider_id=c.github_id::text where c.user_id=uid and c.org_status='member')
$$;
create function private_website_github.snapshot(uid uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('connected',i.id is not null,'github_id',i.provider_id,'login',case when i.id is not null then coalesce(c.login,i.identity_data->>'user_name',i.identity_data->>'preferred_username') end,'org_status',case when i.id is null then 'not_connected' else coalesce(c.org_status,'not_invited') end,'checked_at',c.checked_at,'required_for_projects',(select required_for_projects from private_website_github.policy where id))
 from (select 1) seed left join lateral(select * from auth.identities where user_id=uid and provider='github' and provider_id ~ '^[1-9][0-9]{0,18}$' limit 1)i on true left join private_website_github.connections c on c.user_id=uid and c.identity_id=i.id and c.github_id::text=i.provider_id
$$;
create function private_website_github.member(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();i auth.identities;username text;
begin
 if actor is null or not private_website_lab.account_allowed(actor) then raise exception 'Verified member account required' using errcode='42501';end if;
 if action='sync' then
  select * into i from auth.identities where user_id=actor and provider='github' and provider_id ~ '^[1-9][0-9]{0,18}$' limit 1;
  if i.id is not null then
   username:=coalesce(i.identity_data->>'user_name',i.identity_data->>'preferred_username',i.identity_data->>'login');
   if username is null or username !~ '^[A-Za-z0-9][A-Za-z0-9-]{0,38}$' then raise exception 'Reconnect GitHub to confirm your account details';end if;
   insert into private_website_github.connections(user_id,identity_id,github_id,login) values(actor,i.id,i.provider_id::bigint,username)
   on conflict(user_id) do update set identity_id=excluded.identity_id,github_id=excluded.github_id,login=excluded.login,
    org_status=case when private_website_github.connections.github_id<>excluded.github_id then 'not_invited' else private_website_github.connections.org_status end,
    lease=case when private_website_github.connections.github_id<>excluded.github_id then null else private_website_github.connections.lease end,updated_at=now();
  end if;
 elsif action not in ('status','eligibility') then raise exception 'Unsupported GitHub action';end if;
 return private_website_github.snapshot(actor);
end $$;
revoke all on all functions in schema private_website_github from public,anon,authenticated;
grant execute on function private_website_github.member(text,jsonb) to authenticated;
create function public.website_github(p_action text default 'status',p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_github.member(p_action,p_payload)$$;
revoke all on function public.website_github(text,jsonb) from public,anon;
grant execute on function public.website_github(text,jsonb) to authenticated;

-- Provider results can be recorded only by the server's restricted delivery worker.
create function private_website_github.worker(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(payload->>'user_id')::uuid;c private_website_github.connections;run uuid;state text:=payload->>'org_status';tid uuid;previous_claims text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'GitHub server worker required' using errcode='42501';end if;
 if action='policy' then
  update private_website_github.policy set required_for_projects=(payload->>'enabled')::boolean,updated_at=now(),updated_by=uid where id;
  return jsonb_build_object('ok',true);
 end if;
 select * into c from private_website_github.connections where user_id=uid for update;
 if c.user_id is null or not private_website_github.connected(uid) or not private_website_lab.account_allowed(uid) or not exists(select 1 from auth.identities i where i.id=c.identity_id and i.provider_id=c.github_id::text and i.user_id=uid) then return jsonb_build_object('skip',true);end if;
 if action='claim' then
  if c.lease_until>now() or c.attempted_at>now()-interval '45 seconds' then return jsonb_build_object('skip',true,'status',private_website_github.snapshot(uid));end if;
  run:=gen_random_uuid();update private_website_github.connections set lease=run,lease_until=now()+interval '2 minutes',attempted_at=now() where user_id=uid;
  return jsonb_build_object('lease',run,'github_id',c.github_id::text,'login',c.login);
 elsif action='finish' then
  if c.lease is distinct from (payload->>'lease')::uuid then raise exception 'Stale GitHub check' using errcode='40001';end if;
  if state not in ('pending','member','setup_required','failed','unknown') then raise exception 'Invalid organisation state';end if;
  if payload->>'github_id' is distinct from c.github_id::text then raise exception 'GitHub identity changed' using errcode='40001';end if;
  update private_website_github.connections set org_status=state,login=coalesce(nullif(payload->>'login',''),login),invitation_id=nullif(payload->>'invitation_id','')::bigint,checked_at=now(),lease=null,lease_until=null,last_error=left(payload->>'error_code',80),updated_at=now() where user_id=uid;
  if state='member' then
   previous_claims:=current_setting('request.jwt.claims',true);
   perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','service_role')::text,true);
   for tid in select team_id from public.website_project_team_members where user_id=uid and status='confirmed' loop perform private_website_lab.activate_ready_placement(tid);end loop;
   perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
  end if;
  return private_website_github.snapshot(uid);
 end if;raise exception 'Unsupported worker action';
end $$;
revoke all on function private_website_github.worker(text,jsonb) from public,anon,authenticated;
grant execute on function private_website_github.worker(text,jsonb) to service_role;
create function public.website_github_worker(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_github.worker(p_action,p_payload)$$;
revoke all on function public.website_github_worker(text,jsonb) from public,anon,authenticated;
grant execute on function public.website_github_worker(text,jsonb) to service_role;

-- Enforcement is activated only after the owner configures and verifies GitHub connectivity.
create function public.website_my_github_eligible() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and (not (select required_for_projects from private_website_github.policy where id) or private_website_github.connected(auth.uid()))$$;
revoke all on function public.website_my_github_eligible() from public,anon;
grant execute on function public.website_my_github_eligible() to authenticated;
create policy website_interest_github_connection on public.website_project_interests as restrictive for insert to authenticated with check((select public.website_my_github_eligible()));
create function private_website_github.admission_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status='confirmed' and new.admitted_at is not null and (tg_op='INSERT' or old.admitted_at is null or old.status is distinct from new.status) and not private_website_github.lab_ready(new.user_id) then raise exception 'Connect GitHub and accept the Mettelo organisation invitation in My profile before entering a Lab';end if;return new;
end $$;
revoke all on function private_website_github.admission_guard() from public,anon,authenticated;
create trigger z_github_lab_admission before insert or update on public.website_project_team_members for each row execute function private_website_github.admission_guard();
do $upgrade$
declare s text;
begin
 s:=pg_get_functiondef('private_website_lab.readiness(uuid)'::regprocedure);
 if strpos(s,'return jsonb_build_object(''checks'',checks')=0 then raise exception 'Unexpected readiness contract';end if;
 s:=replace(s,'and commitment_confirmed_at is not null;','and commitment_confirmed_at is not null and private_website_github.lab_ready(user_id);');
 s:=replace(s,'and commitment_confirmed_at is not null and r=any(responsibilities)','and commitment_confirmed_at is not null and private_website_github.lab_ready(user_id) and r=any(responsibilities)');
 s:=replace(s,'and commitment_confirmed_at is not null) and (t.participation','and commitment_confirmed_at is not null and private_website_github.lab_ready(user_id)) and (t.participation');
 s:=replace(s,'and m.commitment_confirmed_at is not null)','and m.commitment_confirmed_at is not null and private_website_github.lab_ready(m.user_id))');
 s:=replace(s,'return jsonb_build_object(''checks'',checks',$checks$checks:=checks||jsonb_build_array(jsonb_build_object('label','GitHub organisation membership','ready',filled>=need));
 return jsonb_build_object('checks',checks$checks$);execute s;
 s:=pg_get_functiondef('public.website_validate_pilot_team()'::regprocedure);
 s:=replace(s,'and commitment_confirmed_at is not null;','and commitment_confirmed_at is not null and private_website_github.lab_ready(user_id);');
 s:=replace(s,'and commitment_confirmed_at is not null) then raise exception ''A confirmed coordinator','and commitment_confirmed_at is not null and private_website_github.lab_ready(user_id)) then raise exception ''A confirmed coordinator');
 s:=replace(s,'and commitment_confirmed_at is not null and r=any(responsibilities)','and commitment_confirmed_at is not null and private_website_github.lab_ready(user_id) and r=any(responsibilities)');
 s:=replace(s,'and m.commitment_confirmed_at is not null)) then raise exception ''Assign a team member','and m.commitment_confirmed_at is not null and private_website_github.lab_ready(m.user_id))) then raise exception ''Assign a team member');execute s;
 s:=pg_get_functiondef('private_website_lab.activate_ready_placement(uuid)'::regprocedure);
 s:=replace(s,'and private_website_lab.account_allowed(m.user_id) and not exists','and private_website_lab.account_allowed(m.user_id) and private_website_github.lab_ready(m.user_id) and not exists');execute s;
end $upgrade$;
alter function private_website_lab.operations(text,jsonb) rename to operations_before_github_connection;
revoke all on function private_website_lab.operations_before_github_connection(text,jsonb) from public,anon,authenticated;
create function private_website_lab.operations(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;actor uuid:=auth.uid();g jsonb;
begin
 if p_action in ('workspace','chat_snapshot','discussion','discussion_edit','discussion_delete','discussion_pin','discussion_classify','chat_link','task_status','task_history','meeting_save','meeting_cancel','add_item','assign_item') and not private_website_lab.permitted(actor,'operations') and not private_website_github.lab_ready(actor) then raise exception 'Connect GitHub and accept the Mettelo organisation invitation in My profile to work in a Lab' using errcode='42501';end if;
 result:=private_website_lab.operations_before_github_connection(p_action,p_payload);
 if p_action='mine' then g:=private_website_github.snapshot(actor);return coalesce((select jsonb_agg(x||jsonb_build_object('github_required',g->'required_for_projects','github_connected',g->'connected','github_org_status',g->'org_status','can_enter',(x->>'can_enter')::boolean and private_website_github.lab_ready(actor))) from jsonb_array_elements(result)x),'[]');end if;
 return result;
end $$;
revoke all on function private_website_lab.operations(text,jsonb) from public,anon;
grant execute on function private_website_lab.operations(text,jsonb) to authenticated;
alter function private_website_lab.manage_members(text,jsonb) rename to manage_members_before_github;
revoke all on function private_website_lab.manage_members_before_github(text,jsonb) from public,anon,authenticated;
create function private_website_lab.manage_members(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private_website_lab.manage_members_before_github(p_action,p_payload);
 if p_action='detail' then return result||jsonb_build_object('github',private_website_github.snapshot((p_payload->>'user_id')::uuid));
 elsif p_action='list' then return result||jsonb_build_object('members',coalesce((select jsonb_agg(x||jsonb_build_object('github',private_website_github.snapshot((x->>'id')::uuid))) from jsonb_array_elements(result->'members')x),'[]'));end if;
 return result;
end $$;
revoke all on function private_website_lab.manage_members(text,jsonb) from public,anon;
grant execute on function private_website_lab.manage_members(text,jsonb) to authenticated;
notify pgrst,'reload schema';
