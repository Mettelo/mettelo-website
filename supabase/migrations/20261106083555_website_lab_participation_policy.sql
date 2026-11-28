begin;
-- Entitlements describe participation allowances only; no billing or verification state.
create table private_website_lab.participation_policy (
 id boolean primary key default true check(id),
 lab_allowance integer not null default 2 check(lab_allowance between 0 and 100),
 version bigint not null default 1,
 updated_at timestamptz not null default now()
);
insert into private_website_lab.participation_policy(id) values(true);
create table private_website_lab.participation_entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 lab_allowance integer not null check(lab_allowance between 0 and 100),
 valid_until timestamptz,
 reason text not null check(length(btrim(reason)) between 8 and 500),
 created_at timestamptz not null default now()
);
alter table private_website_lab.participation_policy enable row level security;
alter table private_website_lab.participation_entitlements enable row level security;
revoke all on private_website_lab.participation_policy,private_website_lab.participation_entitlements from public,anon,authenticated;

create function private_website_lab.participation_kind(member_status text,team_status text,expires timestamptz,admitted timestamptz,external_checked timestamptz,external_revoked timestamptz) returns text
language sql stable set search_path='' as $$
 select case
 when team_status='completed' then null
 when member_status='left' and (admitted is not null or (external_checked is not null and external_revoked is null)) then 'revoking'
 when member_status='offered' and (expires is null or expires>now()) then 'reserved_offer'
 when member_status='confirmed' and team_status='paused' then 'paused'
 when member_status='confirmed' and team_status='active' and admitted is not null then 'active'
 when member_status='confirmed' then 'accepted'
 else null end
$$;
create function private_website_lab.participation_allowance(uid uuid) returns integer
language sql stable security definer set search_path='' as $$
 select coalesce((select lab_allowance from private_website_lab.participation_entitlements where user_id=uid and (valid_until is null or valid_until>now())),(select lab_allowance from private_website_lab.participation_policy where id))
$$;
create function private_website_lab.participation_locks(users uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 for uid in select distinct x from unnest(users) x where x is not null order by x loop
  perform pg_advisory_xact_lock(hashtextextended('website-lab-participation:'||uid::text,0));
 end loop;
 -- Shared policy lock: a concurrent default-policy edit must wait for in-flight decisions.
 perform 1 from private_website_lab.participation_policy where id for share;
end $$;

create function private_website_lab.participation_usage(uid uuid,excluded_team uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;allowance integer:=private_website_lab.participation_allowance(uid);
begin
 select jsonb_build_object('used',count(*),'active',count(*) filter(where kind='active'),'reserved',count(*) filter(where kind in ('reserved_offer','accepted')),'paused',count(*) filter(where kind='paused'),'revoking',count(*) filter(where kind='revoking'),'allowance',allowance,'available',greatest(allowance-count(*),0)) into result
 from (select m.team_id,private_website_lab.participation_kind(m.status,t.status,m.offer_expires_at,m.admitted_at,m.access_verified_at,m.external_access_revoked_at) kind from public.website_project_team_members m join public.website_project_teams t on t.id=m.team_id where m.user_id=uid and (excluded_team is null or m.team_id<>excluded_team)) x where kind is not null;
 return result;
end $$;

create function private_website_lab.guard_participation_entitlement() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.user_id<>old.user_id then raise exception 'Entitlement identity is immutable';end if;
 perform private_website_lab.participation_locks(array[case when tg_op='DELETE' then old.user_id else new.user_id end]);
 if tg_op='DELETE' then return old;end if;
 return new;
end $$;
create trigger participation_entitlement_lock before insert or update or delete on private_website_lab.participation_entitlements for each row execute function private_website_lab.guard_participation_entitlement();

create function private_website_lab.assert_participation_slot(uid uuid,tid uuid) returns void
language plpgsql security definer set search_path='' as $$
declare usage jsonb;
begin
 perform private_website_lab.participation_locks(array[uid]);
 usage:=private_website_lab.participation_usage(uid,tid);
 if (usage->>'used')::integer >= (usage->>'allowance')::integer then
  raise exception 'Lab participation limit reached (% slots). Paused Labs, accepted places and unexpired offers hold slots; leaving releases a slot after required access revocation is complete.',usage->>'allowance' using errcode='P0001';
 end if;
end $$;

create function private_website_lab.guard_participation_member() returns trigger
language plpgsql security definer set search_path='' as $$
declare old_kind text;new_kind text;tstatus text;uid uuid:=case when tg_op='DELETE' then old.user_id else new.user_id end;
begin
 perform private_website_lab.participation_locks(array[uid]);
 select status into tstatus from public.website_project_teams where id=case when tg_op='DELETE' then old.team_id else new.team_id end;
 if tg_op<>'INSERT' then old_kind:=private_website_lab.participation_kind(old.status,tstatus,old.offer_expires_at,old.admitted_at,old.access_verified_at,old.external_access_revoked_at);end if;
 if tg_op='DELETE' then
  if old_kind is not null and exists(select 1 from auth.users where id=uid) then raise exception 'Release membership and complete required access revocation before deleting it';end if;
  return old;
 end if;
 new_kind:=private_website_lab.participation_kind(new.status,tstatus,new.offer_expires_at,new.admitted_at,new.access_verified_at,new.external_access_revoked_at);
 if tg_op='UPDATE' and old.status='left' and old_kind='revoking' and new.status in ('offered','confirmed') then raise exception 'Complete required access revocation before re-offering this placement';end if;
 if new_kind is not null and old_kind is null then perform private_website_lab.assert_participation_slot(uid,new.team_id);end if;
 return new;
end $$;
create trigger a_website_participation_member before insert or update or delete on public.website_project_team_members for each row execute function private_website_lab.guard_participation_member();

create function private_website_lab.guard_participation_team() returns trigger
language plpgsql security definer set search_path='' as $$
declare uid uuid;users uuid[];
begin
 if new.status is not distinct from old.status then return new;end if;
 select array_agg(user_id order by user_id) into users from public.website_project_team_members where team_id=new.id;
 perform private_website_lab.participation_locks(users);
 -- A completed Lab can only consume slots again if every affected member has room.
 if old.status='completed' and new.status<>'completed' then
  for uid in select m.user_id from public.website_project_team_members m where m.team_id=new.id and private_website_lab.participation_kind(m.status,new.status,m.offer_expires_at,m.admitted_at,m.access_verified_at,m.external_access_revoked_at) is not null order by m.user_id loop
   perform private_website_lab.assert_participation_slot(uid,new.id);
  end loop;
 end if;
 return new;
end $$;
create trigger a_website_participation_team before update of status on public.website_project_teams for each row execute function private_website_lab.guard_participation_team();

-- Every public write entry obtains member locks before existing team/project locks.
alter function private_website_lab.operations(text,jsonb) rename to operations_before_participation_policy;
revoke all on function private_website_lab.operations_before_participation_policy(text,jsonb) from public,anon,authenticated;
create function private_website_lab.operations(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();tid uuid:=nullif(p_payload->>'team_id','')::uuid;users uuid[];
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not private_website_lab.account_allowed(actor) then raise exception 'Verified account access required' using errcode='42501';end if;
 if p_action='participation_usage' then return private_website_lab.participation_usage(actor);end if;
 if p_action in ('form_group','offer','respond','confirm_commitment','agree_coordinator','agree_two','verify_access','allow_two','prepare_workspace','add_item','assign_item','expire_offer','admit_member','release_member','external_access_review','start','placement_status','reopen_preparation') then
  if p_action='assign_item' and tid is null then select team_id into tid from private_website_lab.items where id=(p_payload->>'item_id')::uuid;end if;
  select array_agg(distinct uid order by uid) into users from (
   select actor uid
   union select user_id from public.website_project_team_members where team_id=tid
   union select user_id from public.website_project_interests where id=nullif(p_payload->>'interest_id','')::uuid
   union select i.user_id from jsonb_array_elements(case when p_action='form_group' then coalesce(p_payload->'members','[]') else '[]'::jsonb end) x join public.website_project_interests i on i.id=(x->>'interest_id')::uuid
  ) affected;
  perform private_website_lab.participation_locks(users);
 end if;
 return private_website_lab.operations_before_participation_policy(p_action,p_payload);
end $$;
revoke all on function private_website_lab.participation_kind(text,text,timestamptz,timestamptz,timestamptz,timestamptz),private_website_lab.participation_allowance(uuid),private_website_lab.participation_locks(uuid[]),private_website_lab.participation_usage(uuid,uuid),private_website_lab.assert_participation_slot(uuid,uuid),private_website_lab.guard_participation_member(),private_website_lab.guard_participation_team(),private_website_lab.operations(text,jsonb) from public,anon,authenticated;
revoke all on function private_website_lab.guard_participation_entitlement() from public,anon,authenticated;
grant execute on function private_website_lab.operations(text,jsonb) to authenticated;
create or replace function public.website_lab(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.operations(p_action,p_payload)$$;
notify pgrst,'reload schema';
commit;
