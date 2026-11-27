-- Private, reversible source ledger. This migration deliberately grants no Lab access.
-- Membership materialisation is a separate reviewed step; no Auth users, applications,
-- consent timestamps, notifications or GitHub invitations are created here.
create schema private_legacy_roster;
revoke all on schema private_legacy_roster from public,anon,authenticated,service_role;

create table private_legacy_roster.batches (
 batch_key text primary key check(length(batch_key) between 8 and 120),
 payload jsonb not null,
 state text not null default 'rehearsal' check(state in ('rehearsal','approved')),
 created_at timestamptz not null default now()
);
create table private_legacy_roster.people (
 batch_key text not null references private_legacy_roster.batches on delete cascade,
 person_key text not null,
 normalized_email text,
 held boolean not null,
 source jsonb not null,
 primary key(batch_key,person_key),
 unique(batch_key,normalized_email),
 check(held or (normalized_email=lower(btrim(normalized_email)) and normalized_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 check(held or normalized_email is not null)
);
create table private_legacy_roster.groups (
 batch_key text not null references private_legacy_roster.batches on delete cascade,
 group_key text not null,
 project_ref text not null references public.website_project_briefs(project_ref),
 arrangement text not null check(arrangement in ('Team','Solo')),
 source jsonb not null,
 primary key(batch_key,group_key)
);
create table private_legacy_roster.allocations (
 batch_key text not null,
 source_row integer not null check(source_row>0),
 group_key text not null,
 person_key text,
 recorded_status text not null check(recorded_status in ('Confirmed','Awaiting acknowledgement')),
 contact_hold boolean not null,
 eligible_access boolean not null,
 source jsonb not null,
 primary key(batch_key,source_row),
 foreign key(batch_key,group_key) references private_legacy_roster.groups on delete cascade,
 foreign key(batch_key,person_key) references private_legacy_roster.people,
 check(person_key is not null or contact_hold),
 check(not eligible_access or (recorded_status='Confirmed' and not contact_hold))
);
create index legacy_allocations_person on private_legacy_roster.allocations(batch_key,person_key);
create table private_legacy_roster.history (
 batch_key text not null references private_legacy_roster.batches on delete cascade,
 source_row integer not null,
 source jsonb not null check(source->>'recordedAssignmentStatus' in ('Withdrawn','Awaiting project choice')),
 primary key(batch_key,source_row)
);
create table private_legacy_roster.claims (
 batch_key text not null,
 person_key text not null,
 user_id uuid not null references auth.users(id),
 claimed_at timestamptz not null default now(),
 primary key(batch_key,person_key),
 unique(batch_key,user_id),
 foreign key(batch_key,person_key) references private_legacy_roster.people on delete cascade
);
create index legacy_claims_user on private_legacy_roster.claims(user_id,batch_key);

alter table private_legacy_roster.batches enable row level security;
alter table private_legacy_roster.people enable row level security;
alter table private_legacy_roster.groups enable row level security;
alter table private_legacy_roster.allocations enable row level security;
alter table private_legacy_roster.history enable row level security;
alter table private_legacy_roster.claims enable row level security;
revoke all on all tables in schema private_legacy_roster from public,anon,authenticated,service_role;

-- Operator-only: identical retries are no-ops; a changed source requires a new
-- reviewed batch. No ON CONFLICT update can silently overwrite an earlier review.
create function private_legacy_roster.import_batch(p_key text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous jsonb;row_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('legacy-roster:'||p_key,0));
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->>'version' is distinct from '1'
 or coalesce(p_payload->>'outbound','')<>'suppressed'
 or jsonb_typeof(p_payload->'manifest') is distinct from 'object'
 or jsonb_typeof(p_payload->'people') is distinct from 'array'
 or jsonb_typeof(p_payload->'groups') is distinct from 'array'
 or jsonb_typeof(p_payload->'allocations') is distinct from 'array'
 or jsonb_typeof(p_payload->'history') is distinct from 'array' then
  raise exception 'Complete reviewed source manifest and suppressed outbound policy required';
 end if;
 if jsonb_array_length(p_payload->'people')>10000 or jsonb_array_length(p_payload->'allocations')>30000 then raise exception 'Split this source into bounded reviewed batches';end if;
 select payload into previous from private_legacy_roster.batches where batch_key=p_key for update;
 if found then
  if previous is distinct from p_payload then raise exception 'Batch source changed; review a new batch';end if;
  return jsonb_build_object('repeated',true);
 end if;
 insert into private_legacy_roster.batches(batch_key,payload) values(p_key,p_payload);
 insert into private_legacy_roster.people(batch_key,person_key,normalized_email,held,source)
 select p_key,x->>'personKey',nullif(x->>'email',''),(x->>'held')::boolean,x from jsonb_array_elements(p_payload->'people') x;
 insert into private_legacy_roster.groups(batch_key,group_key,project_ref,arrangement,source)
 select p_key,x->>'teamRef',x->>'projectCode',x->>'arrangement',x from jsonb_array_elements(p_payload->'groups') x;
 insert into private_legacy_roster.allocations(batch_key,source_row,group_key,person_key,recorded_status,contact_hold,eligible_access,source)
 select p_key,(x->>'sourceRow')::integer,x->>'teamRef',nullif(x->>'personKey',''),x->>'recordedAssignmentStatus',(x->>'contactHold')::boolean,(x->>'activeWorkspaceAccessAfterVerifiedClaim')::boolean,x
 from jsonb_array_elements(p_payload->'allocations') x;
 if exists(select 1 from private_legacy_roster.allocations a join private_legacy_roster.groups g using(batch_key,group_key)
 left join private_legacy_roster.people p using(batch_key,person_key)
 where a.batch_key=p_key and ((p.held and not a.contact_hold) or a.source->>'projectCode' is distinct from g.project_ref)) then raise exception 'Contact hold or project mismatch';end if;
 insert into private_legacy_roster.history(batch_key,source_row,source)
 select p_key,(x->>'sourceRow')::integer,x from jsonb_array_elements(p_payload->'history') x;
 if exists(select 1 from private_legacy_roster.history h join private_legacy_roster.allocations a using(batch_key,source_row) where h.batch_key=p_key) then raise exception 'Source row cannot be history and allocation';end if;
 if exists(select 1 from private_legacy_roster.allocations where batch_key=p_key and person_key is not null group by person_key,group_key having count(*)>1) then raise exception 'Duplicate person/group allocation';end if;
 return jsonb_build_object('repeated',false,'people',jsonb_array_length(p_payload->'people'),'groups',jsonb_array_length(p_payload->'groups'),'allocations',jsonb_array_length(p_payload->'allocations'),'history',jsonb_array_length(p_payload->'history'));
end $$;

-- Reserved for the later verified-account integration. Never accepts an email,
-- person key or user id from the caller. Claims only link private reviewed rows;
-- they do not create memberships or grant access on their own.
create function private_legacy_roster.claim_current_account(p_batch text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare claimant uuid:=auth.uid();account_email text;person text;existing uuid;
begin
 if claimant is null or not private_website_lab.account_allowed(claimant) then raise exception 'Verified available account required' using errcode='42501';end if;
 perform private_website_lab.participation_locks(array[claimant]);
 select lower(btrim(email)) into account_email from auth.users where id=claimant and email_confirmed_at is not null and not coalesce(is_anonymous,false) for share;
 if account_email is null then raise exception 'Verified email ownership required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('legacy-roster:'||p_batch,0));
 if not exists(select 1 from private_legacy_roster.batches where batch_key=p_batch and state='approved') then raise exception 'Approved batch required';end if;
 select person_key into person from private_legacy_roster.people where batch_key=p_batch and normalized_email=account_email and not held for update;
 if person is null then return jsonb_build_object('matched',false);end if;
 select user_id into existing from private_legacy_roster.claims where batch_key=p_batch and person_key=person;
 if existing is not null and existing<>claimant then raise exception 'Record already claimed; administrator review required' using errcode='42501';end if;
 insert into private_legacy_roster.claims(batch_key,person_key,user_id) values(p_batch,person,claimant) on conflict(batch_key,person_key) do nothing;
 return jsonb_build_object('matched',true,'allocations',(select count(*) from private_legacy_roster.allocations where batch_key=p_batch and person_key=person));
end $$;

-- Cascades only source/claim records in this batch. Future materialised workspace
-- records must introduce an explicit dependency guard before using this cleanup.
create function private_legacy_roster.remove_rehearsal(p_key text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('legacy-roster:'||p_key,0));
 delete from private_legacy_roster.claims where batch_key=p_key;
 delete from private_legacy_roster.allocations where batch_key=p_key;
 delete from private_legacy_roster.batches where batch_key=p_key;
end $$;
revoke all on all functions in schema private_legacy_roster from public,anon,authenticated,service_role;
