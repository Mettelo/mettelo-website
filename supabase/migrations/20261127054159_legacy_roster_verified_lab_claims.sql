-- Restore reviewed existing memberships without fake Auth users, applications or
-- present-day agreement timestamps. Ordinary core/Connect admission is unchanged.
alter table private_legacy_roster.groups add column team_id uuid unique references public.website_project_teams(id),add column after_image jsonb;
alter table private_legacy_roster.groups alter constraint groups_team_id_fkey deferrable initially deferred;
create index legacy_group_project on private_legacy_roster.groups(project_ref);
create index legacy_allocation_group on private_legacy_roster.allocations(batch_key,group_key);
create table private_legacy_roster.memberships (
 batch_key text not null,
 source_row integer not null,
 team_id uuid not null,
 user_id uuid not null references auth.users(id),
 entry_initialized boolean not null default false,
 after_image jsonb,
 primary key(batch_key,source_row),unique(team_id,user_id),
 foreign key(batch_key,source_row) references private_legacy_roster.allocations,
 foreign key(team_id,user_id) references public.website_project_team_members(team_id,user_id) deferrable initially deferred
);
create index legacy_membership_user on private_legacy_roster.memberships(user_id);
create table private_legacy_roster.mutations (
 transaction_id bigint not null,
 batch_key text not null references private_legacy_roster.batches,
 primary key(transaction_id,batch_key)
);
alter table private_legacy_roster.memberships enable row level security;
alter table private_legacy_roster.mutations enable row level security;
revoke all on private_legacy_roster.memberships,private_legacy_roster.mutations from public,anon,authenticated,service_role;

create function private_legacy_roster.mutating(tid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private_legacy_roster.groups g join private_legacy_roster.mutations m using(batch_key) where g.team_id=tid and m.transaction_id=txid_current())
$$;
revoke all on function private_legacy_roster.mutating(uuid) from public,anon,authenticated,service_role;

alter table public.website_project_team_members drop constraint website_project_team_members_admission_route_check,drop constraint market_request_required,drop constraint membership_application_route;
alter table public.website_project_team_members add constraint website_project_team_members_admission_route_check check(admission_route in ('core','market','legacy')),
 add constraint market_request_required check(admission_route<>'market' or market_request_id is not null),
 add constraint membership_application_route check(admission_route<>'core' or interest_id is not null),
 add constraint legacy_has_no_fabricated_application check(admission_route<>'legacy' or (interest_id is null and market_request_id is null));

create function private_legacy_roster.validate_member(m public.website_project_team_members,prior jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare a private_legacy_roster.allocations;g private_legacy_roster.groups;link private_legacy_roster.memberships;expected_role text;
begin
 select * into link from private_legacy_roster.memberships where team_id=m.team_id and user_id=m.user_id;
 select * into a from private_legacy_roster.allocations where batch_key=link.batch_key and source_row=link.source_row;
 select * into g from private_legacy_roster.groups where batch_key=a.batch_key and group_key=a.group_key;
 expected_role:=case when a.source->>'sourceRole' in ('Lead / Coordinator','Solo') then 'Existing coordinator' else 'Existing team member' end;
 if a.source_row is null or a.recorded_status<>'Confirmed' or a.contact_hold or g.team_id is distinct from m.team_id or g.project_ref is distinct from m.project_ref
 or not exists(select 1 from private_legacy_roster.batches where batch_key=a.batch_key and state='approved')
 or not exists(select 1 from private_legacy_roster.claims where batch_key=a.batch_key and person_key=a.person_key and user_id=m.user_id)
 then raise exception 'Reviewed owned existing membership required' using errcode='42501';end if;
 if m.role<>expected_role or m.responsibilities<>array[expected_role] or m.interest_id is not null or m.market_request_id is not null
 or m.acknowledged_at is not null or m.commitment_confirmed_at is not null or m.two_person_agreed_at is not null then
  raise exception 'Preserve source role and historical agreement provenance' using errcode='42501';end if;
 if prior is not null and ((prior->>'user_id')::uuid<>m.user_id or (prior->>'team_id')::uuid<>m.team_id or prior->>'admission_route'<>'legacy') then raise exception 'Existing membership identity is immutable' using errcode='42501';end if;
 if m.status not in ('confirmed','left','declined') then raise exception 'Existing source membership cannot become a new offer';end if;
 if m.admitted_at is not null and (prior is null or prior->>'admitted_at' is null) then
  if not private_legacy_roster.mutating(m.team_id) or link.entry_initialized or not a.eligible_access or not private_website_lab.account_allowed(m.user_id)
  or exists(select 1 from private_website_lab.placement_restrictions where user_id=m.user_id and project_ref=m.project_ref and cleared_at is null)
  then raise exception 'Reviewed initial entry required' using errcode='42501';end if;
 end if;
end $$;
revoke all on function private_legacy_roster.validate_member(public.website_project_team_members,jsonb) from public,anon,authenticated,service_role;

-- Insert narrow legacy branches into existing guards; all ordinary paths remain.
do $patch$
declare source text;
begin
 source:=pg_get_functiondef('public.website_validate_pilot_member()'::regprocedure);
 if strpos(source,'if new.admission_route=''market'' then')=0 then raise exception 'Unexpected membership guard';end if;
 source:=replace(source,'if new.admission_route=''market'' then','if new.admission_route=''legacy'' then perform private_legacy_roster.validate_member(new,case when tg_op=''UPDATE'' then to_jsonb(old) else null end);return new;end if;'||E'\n if new.admission_route=''market'' then');execute source;
 source:=pg_get_functiondef('public.website_validate_pilot_team()'::regprocedure);
 source:=replace(source,'if new.status=''active'' and (tg_op=''INSERT'' or old.status<>''active'') then',
 'if new.status=''active'' and (tg_op=''INSERT'' or old.status<>''active'') and not private_legacy_roster.mutating(new.id) then');execute source;
 -- Rehearsal does not manufacture user notifications, email previews or activity.
 source:=pg_get_functiondef('private_website_lab.member_event()'::regprocedure);
 source:=replace(source,E'begin\n',E'begin\n if tg_table_name=''website_project_team_members'' then if private_legacy_roster.mutating(new.team_id) then return new;end if;end if;\n if tg_table_name=''website_project_teams'' then if private_legacy_roster.mutating(new.id) then return new;end if;end if;\n');execute source;
 source:=pg_get_functiondef('private_website_lab.capture_project_email()'::regprocedure);
 source:=replace(source,E'begin\n',E'begin\n if tg_table_name=''website_project_team_members'' then if private_legacy_roster.mutating(new.team_id) then return new;end if;end if;\n if tg_table_name=''website_project_teams'' then if private_legacy_roster.mutating(new.id) then return new;end if;end if;\n');execute source;
 source:=pg_get_functiondef('public.website_pilot_activity_changed()'::regprocedure);
 source:=replace(source,'update public.website_project_pilot_settings set activity_recorded=true',
 'if tg_table_name=''website_project_teams'' then if tg_op=''DELETE'' then if private_legacy_roster.mutating(old.id) then return null;end if;else if private_legacy_roster.mutating(new.id) then return null;end if;end if;else if tg_op=''DELETE'' then if private_legacy_roster.mutating(old.team_id) then return null;end if;else if private_legacy_roster.mutating(new.team_id) then return null;end if;end if;end if; update public.website_project_pilot_settings set activity_recorded=true');execute source;
end $patch$;

-- This operator-only step materialises groups without placeholder people. Each
-- active group must have an explicitly reviewed eligible confirmed source roster.
create function private_legacy_roster.prepare_workspaces(p_batch text,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g private_legacy_roster.groups;tid uuid;size integer;ready boolean;
begin
 if length(btrim(coalesce(p_reason,'')))<8 then raise exception 'Record owner review';end if;
 perform 1 from private_legacy_roster.batches where batch_key=p_batch for update;
 if not found then raise exception 'Reviewed batch not found';end if;
 if exists(select 1 from private_legacy_roster.groups where batch_key=p_batch and team_id is not null) then return '{"repeated":true}';end if;
 update private_legacy_roster.batches set state='approved' where batch_key=p_batch;
 insert into private_legacy_roster.mutations values(txid_current(),p_batch);
 for g in select * from private_legacy_roster.groups where batch_key=p_batch order by project_ref,group_key loop
  select count(*) into size from private_legacy_roster.allocations where batch_key=p_batch and group_key=g.group_key;
  ready:=coalesce((g.source->>'readinessSubset')::boolean,false);
  if size<1 or size>12 or (ready and not exists(select 1 from private_legacy_roster.allocations where batch_key=p_batch and group_key=g.group_key and eligible_access)) then raise exception 'Review group size and existing entry state';end if;
  -- A label collision is reviewed, never overwritten or silently merged.
  tid:=gen_random_uuid();
  update private_legacy_roster.groups set team_id=tid where batch_key=p_batch and group_key=g.group_key;
  insert into public.website_project_teams(id,project_ref,label,participation,minimum_members,maximum_members,accepting_members)
   values(tid,g.project_ref,g.group_key,lower(g.arrangement),case when g.arrangement='Solo' then 1 else 2 end,greatest(3,size),false);
  update public.website_project_teams set status=case when ready then 'active' else 'forming' end,lab_enabled=ready where id=tid;
  update private_legacy_roster.groups set after_image=(select to_jsonb(t) from public.website_project_teams t where id=tid) where batch_key=p_batch and group_key=g.group_key;
 end loop;
 delete from private_legacy_roster.mutations where transaction_id=txid_current() and batch_key=p_batch;
 return jsonb_build_object('groups',(select count(*) from private_legacy_roster.groups where batch_key=p_batch),'review',p_reason);
end $$;
revoke all on function private_legacy_roster.prepare_workspaces(text,text) from public,anon,authenticated,service_role;

create function private_legacy_roster.materialize_my_labs() returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();account_email text;p record;a record;link private_legacy_roster.memberships;enter boolean;expected_role text;changed boolean;
begin
 if actor is null or not private_website_lab.account_allowed(actor) then raise exception 'Verified available account required' using errcode='42501';end if;
 perform private_website_lab.participation_locks(array[actor]);
 select lower(btrim(email)) into account_email from auth.users where id=actor and email_confirmed_at is not null and not coalesce(is_anonymous,false) for share;
 if account_email is null then raise exception 'Verified email ownership required' using errcode='42501';end if;
 -- A share lock lets independent claimants proceed; batch rollback takes an
 -- exclusive lock. Each member's allowance lock serialises all admission routes.
 for p in select people.* from private_legacy_roster.people people join private_legacy_roster.batches b using(batch_key)
  where people.normalized_email=account_email and not people.held and b.state='approved' order by people.batch_key for share of b for update of people loop
  if exists(select 1 from private_legacy_roster.claims where batch_key=p.batch_key and person_key=p.person_key and user_id<>actor) then raise exception 'Existing account linkage requires review' using errcode='42501';end if;
  insert into private_legacy_roster.claims(batch_key,person_key,user_id) values(p.batch_key,p.person_key,actor) on conflict(batch_key,person_key) do nothing;
 end loop;
 for a in select allocations.*,g.team_id,g.project_ref,g.arrangement from private_legacy_roster.allocations allocations
  join private_legacy_roster.groups g using(batch_key,group_key) join private_legacy_roster.claims c using(batch_key,person_key)
  where c.user_id=actor and allocations.recorded_status='Confirmed' and not allocations.contact_hold order by g.project_ref,g.team_id loop
  if a.team_id is null then raise exception 'Existing team preparation required';end if;
  perform 1 from public.website_project_teams where id=a.team_id for update;
  if exists(select 1 from private_website_lab.placement_restrictions where user_id=actor and project_ref=a.project_ref and cleared_at is null) then raise exception 'Existing placement restriction requires review' using errcode='42501';end if;
  select * into link from private_legacy_roster.memberships where batch_key=a.batch_key and source_row=a.source_row for update;
  if link.user_id is not null and link.after_image is distinct from (select to_jsonb(m) from public.website_project_team_members m where m.team_id=a.team_id and m.user_id=actor) then continue;end if;
  changed:=false;
  enter:=a.eligible_access and private_website_github.lab_ready(actor) and exists(select 1 from public.website_project_teams where id=a.team_id and lab_enabled and status in ('active','completed'));
  insert into private_legacy_roster.mutations values(txid_current(),a.batch_key) on conflict do nothing;
  if link.user_id is null then
   insert into private_legacy_roster.memberships(batch_key,source_row,team_id,user_id) values(a.batch_key,a.source_row,a.team_id,actor);
   expected_role:=case when a.source->>'sourceRole' in ('Lead / Coordinator','Solo') then 'Existing coordinator' else 'Existing team member' end;
   insert into public.website_project_team_members(team_id,user_id,project_ref,role,responsibilities,status,admission_route,admitted_at)
    values(a.team_id,actor,a.project_ref,expected_role,array[expected_role],'confirmed','legacy',case when enter then now() end);
   changed:=true;
  elsif link.user_id<>actor then raise exception 'Membership already linked' using errcode='42501';
  elsif enter and not link.entry_initialized then
   update public.website_project_team_members set admitted_at=now() where team_id=a.team_id and user_id=actor and status='confirmed' and admitted_at is null;
   changed:=found;
  end if;
  if a.source->>'sourceRole' in ('Lead / Coordinator','Solo') and (select to_jsonb(t)=g.after_image from public.website_project_teams t join private_legacy_roster.groups g on g.team_id=t.id where t.id=a.team_id) then
   update public.website_project_teams set coordinator_id=actor where id=a.team_id and coordinator_id is null;
   if found then update private_legacy_roster.groups set after_image=(select to_jsonb(t) from public.website_project_teams t where id=a.team_id) where batch_key=a.batch_key and group_key=a.group_key;end if;
  end if;
  if changed then update private_legacy_roster.memberships set entry_initialized=entry_initialized or enter,
   after_image=(select to_jsonb(m) from public.website_project_team_members m where m.team_id=a.team_id and m.user_id=actor)
   where batch_key=a.batch_key and source_row=a.source_row;end if;
 end loop;
 delete from private_legacy_roster.mutations where transaction_id=txid_current();
end $$;
revoke all on function private_legacy_roster.materialize_my_labs() from public,anon,authenticated,service_role;

-- Public result contains only the caller's reviewed assignment state. Failure to
-- attach every place is atomic and is surfaced for review; no partial admission.
create function private_legacy_roster.claim_my_labs() returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();account_email text;review text;assignments jsonb;
begin
 if actor is null or not private_website_lab.account_allowed(actor) then raise exception 'Verified available account required' using errcode='42501';end if;
 select lower(btrim(email)) into account_email from auth.users where id=actor and email_confirmed_at is not null and not coalesce(is_anonymous,false);
 if account_email is null then raise exception 'Verified email ownership required' using errcode='42501';end if;
 begin
  perform private_legacy_roster.materialize_my_labs();
 exception when unique_violation then review:='placement_conflict';
  when sqlstate 'P0001' then review:='participation_review';
  when insufficient_privilege then review:='access_review';
 end;
 select coalesce(jsonb_agg(jsonb_build_object('team_id',g.team_id,'project_ref',g.project_ref,'title',b.title,'label',g.group_key,
  'source_status',a.recorded_status,'source_role',a.source->>'sourceRole','participation',lower(g.arrangement),
  'team_status',t.status,'can_enter',m.status='confirmed' and m.admitted_at is not null and m.external_access_revoked_at is null and t.lab_enabled and t.status in ('active','completed') and private_website_github.lab_ready(actor),
  'linked',m.user_id is not null,'eligible_access',a.eligible_access,'review',review) order by g.project_ref,g.group_key),'[]') into assignments
 from private_legacy_roster.people p join private_legacy_roster.batches batch using(batch_key)
 join private_legacy_roster.allocations a using(batch_key,person_key) join private_legacy_roster.groups g using(batch_key,group_key)
 join public.website_project_briefs b on b.project_ref=g.project_ref left join public.website_project_teams t on t.id=g.team_id
 left join public.website_project_team_members m on m.team_id=g.team_id and m.user_id=actor
 where p.normalized_email=account_email and not p.held and not a.contact_hold and batch.state='approved';
 return jsonb_build_object('review',review,'assignments',assignments);
end $$;
revoke all on function private_legacy_roster.claim_my_labs() from public,anon,service_role;
grant usage on schema private_legacy_roster to authenticated;
grant execute on function private_legacy_roster.claim_my_labs() to authenticated;
create function public.website_claim_existing_labs() returns jsonb language sql security invoker set search_path='' as $$select private_legacy_roster.claim_my_labs()$$;
revoke all on function public.website_claim_existing_labs() from public,anon,service_role;
grant execute on function public.website_claim_existing_labs() to authenticated;

-- Account activation also occurs on password sign-in; the first mine/usage read
-- performs the same verified, idempotent claim before the ordinary Lab queries.
alter function private_website_lab.operations(text,jsonb) rename to operations_before_existing_labs;
revoke all on function private_website_lab.operations_before_existing_labs(text,jsonb) from public,anon,authenticated;
create function private_website_lab.operations(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;claim jsonb;
begin
 if p_action in ('mine','participation_usage') then claim:=private_legacy_roster.claim_my_labs();end if;
 result:=private_website_lab.operations_before_existing_labs(p_action,p_payload);
 if p_action='mine' then
  return coalesce((select jsonb_agg(case when m.admission_route='legacy' then x||jsonb_build_object('admission_route','legacy','legacy_source_status',a.recorded_status,'legacy_source_role',a.source->>'sourceRole','legacy_review',claim->'review','can_enter',m.status='confirmed' and m.admitted_at is not null and m.external_access_revoked_at is null and t.lab_enabled and t.status in ('active','completed') and private_website_github.lab_ready(auth.uid()),'commitment_confirmed',null,'is_nominee',false,'coordinator_agreed',null) else x end)
  from jsonb_array_elements(result) x join public.website_project_team_members m on m.team_id=(x->>'team_id')::uuid and m.user_id=auth.uid()
  join public.website_project_teams t on t.id=m.team_id left join private_legacy_roster.memberships lm on lm.team_id=m.team_id and lm.user_id=m.user_id
  left join private_legacy_roster.allocations a on a.batch_key=lm.batch_key and a.source_row=lm.source_row),'[]');
 end if;
 return result;
end $$;
revoke all on function private_website_lab.operations(text,jsonb) from public,anon;
grant execute on function private_website_lab.operations(text,jsonb) to authenticated;

-- Cleanup is safe only before imported work has diverged. FK-based work detection
-- includes future team-scoped tables automatically. Never delete a user account.
create or replace function private_legacy_roster.remove_rehearsal(p_key text) returns void
language plpgsql security definer set search_path='' as $$
declare g record;m record;dependency record;has_work boolean;users uuid[];
begin
 select array_agg(distinct user_id order by user_id) into users from private_legacy_roster.memberships where batch_key=p_key;
 perform private_website_lab.participation_locks(users);
 perform 1 from private_legacy_roster.batches where batch_key=p_key for update;
 if not found then return;end if;
 if users is distinct from (select array_agg(distinct user_id order by user_id) from private_legacy_roster.memberships where batch_key=p_key) then raise exception 'Claim set changed; retry rollback';end if;
 for g in select * from private_legacy_roster.groups where batch_key=p_key and team_id is not null order by project_ref,team_id loop
  perform 1 from public.website_project_teams where id=g.team_id for update;
  if (select to_jsonb(t) from public.website_project_teams t where id=g.team_id) is distinct from g.after_image then raise exception 'Imported team changed; preserve work and review rollback';end if;
  if exists(select 1 from public.website_project_team_members p where p.team_id=g.team_id and not exists(select 1 from private_legacy_roster.memberships l where l.batch_key=p_key and l.team_id=p.team_id and l.user_id=p.user_id)) then raise exception 'Unrelated membership exists; review rollback';end if;
  for dependency in select ns.nspname schema_name,c.relname table_name,att.attname column_name from pg_constraint k
   join pg_class c on c.oid=k.conrelid join pg_namespace ns on ns.oid=c.relnamespace join pg_attribute att on att.attrelid=c.oid and att.attnum=k.conkey[1]
   where k.contype='f' and k.confrelid='public.website_project_teams'::regclass and cardinality(k.conkey)=1
   and k.conrelid not in ('public.website_project_team_members'::regclass,'private_legacy_roster.groups'::regclass) loop
   execute format('select exists(select 1 from %I.%I where %I=$1)',dependency.schema_name,dependency.table_name,dependency.column_name) into has_work using g.team_id;
   if has_work then raise exception 'Imported workspace has dependent work; review rollback';end if;
  end loop;
 end loop;
 for m in select * from private_legacy_roster.memberships where batch_key=p_key loop
  if (select to_jsonb(p) from public.website_project_team_members p where p.team_id=m.team_id and p.user_id=m.user_id) is distinct from m.after_image then raise exception 'Imported member changed; review rollback';end if;
 end loop;
 insert into private_legacy_roster.mutations values(txid_current(),p_key);
 -- This internal cleanup deletes only rows with exact recorded after-images.
 -- Participation guard permits cleanup solely under this private mutation proof.
 delete from private_legacy_roster.memberships where batch_key=p_key;
 delete from public.website_project_team_members p using private_legacy_roster.groups g where g.batch_key=p_key and p.team_id=g.team_id;
 for g in select * from private_legacy_roster.groups where batch_key=p_key and team_id is not null loop
  delete from public.website_project_teams where id=g.team_id;
  update private_legacy_roster.groups set team_id=null where batch_key=p_key and group_key=g.group_key;
 end loop;
 delete from private_legacy_roster.mutations where transaction_id=txid_current() and batch_key=p_key;
 delete from private_legacy_roster.claims where batch_key=p_key;
 delete from private_legacy_roster.allocations where batch_key=p_key;
 delete from private_legacy_roster.batches where batch_key=p_key;
end $$;
revoke all on function private_legacy_roster.remove_rehearsal(text) from public,anon,authenticated,service_role;
do $patch$
declare source text;
begin
 source:=pg_get_functiondef('private_website_lab.guard_participation_member()'::regprocedure);
 source:=replace(source,E' if tg_op=''DELETE'' then\n',E' if tg_op=''DELETE'' then\n  if private_legacy_roster.mutating(old.team_id) then return old;end if;\n');execute source;
end $patch$;
