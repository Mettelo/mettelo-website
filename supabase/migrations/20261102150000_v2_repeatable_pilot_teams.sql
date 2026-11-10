create table public.website_project_pilot_settings (
 project_ref text primary key references public.website_project_briefs(project_ref),
 max_active_teams integer not null default 5 check(max_active_teams between 1 and 50),
 activity_recorded boolean not null default false
);
insert into public.website_project_pilot_settings(project_ref) select project_ref from public.website_project_briefs;
create table public.website_project_teams (
 id uuid primary key default gen_random_uuid(), project_ref text not null references public.website_project_pilot_settings(project_ref),
 label text not null check(length(btrim(label)) between 1 and 80),
 status text not null default 'forming' check(status in ('forming','active','paused','completed')),
 minimum_members integer not null default 3 check(minimum_members between 1 and 50),
 required_roles text[] not null default '{}', accepting_members boolean not null default true,
 started_at timestamptz, created_at timestamptz not null default now(), unique(project_ref,label)
);
create table public.website_project_team_members (
 team_id uuid not null references public.website_project_teams(id),
 interest_id uuid not null references public.website_project_interests(id),
 user_id uuid not null references auth.users(id), role text not null,
 status text not null default 'confirmed' check(status in ('confirmed','left')),
 joined_at timestamptz not null default now(), primary key(team_id,user_id)
);
create index website_pilot_team_project on public.website_project_teams(project_ref,status);
create index website_pilot_member_interest on public.website_project_team_members(interest_id);
create index website_pilot_member_user on public.website_project_team_members(user_id);
alter table public.website_project_pilot_settings enable row level security;
alter table public.website_project_teams enable row level security;
alter table public.website_project_team_members enable row level security;
revoke all on public.website_project_pilot_settings,public.website_project_teams,public.website_project_team_members from anon,authenticated;
grant all on public.website_project_pilot_settings,public.website_project_teams,public.website_project_team_members to service_role;
create function public.website_reconcile_pilot_teams(p_project_ref text) returns void language plpgsql security definer set search_path='' as $$
declare candidate record; capacity integer; running integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_project_ref,0));
 select max_active_teams into capacity from public.website_project_pilot_settings where project_ref=p_project_ref;
 select count(*) into running from public.website_project_teams where project_ref=p_project_ref and status='active';
 for candidate in select * from public.website_project_teams where project_ref=p_project_ref and status='forming' order by created_at,id loop
  exit when running>=capacity;
  if (select count(*) from public.website_project_team_members where team_id=candidate.id and status='confirmed')>=candidate.minimum_members
  and not exists(select 1 from unnest(candidate.required_roles) r where not exists(select 1 from public.website_project_team_members m where m.team_id=candidate.id and m.status='confirmed' and m.role=r)) then
   update public.website_project_teams set status='active',started_at=coalesce(started_at,now()) where id=candidate.id;
   running:=running+1;
  end if;
 end loop;
end $$;
revoke all on function public.website_reconcile_pilot_teams(text) from public,anon,authenticated;
grant execute on function public.website_reconcile_pilot_teams(text) to service_role;
create function public.website_validate_pilot_member() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.team_id<>old.team_id or new.user_id<>old.user_id or new.interest_id<>old.interest_id) then raise exception 'Membership identity is immutable'; end if;
 if not exists(select 1 from public.website_project_interests i join public.website_project_teams t on t.project_ref=i.project_ref join public.website_project_briefs b on b.project_ref=t.project_ref join auth.users u on u.id=i.user_id where t.id=new.team_id and i.id=new.interest_id and i.user_id=new.user_id and u.email_confirmed_at is not null and b.roles ? new.role) then raise exception 'Membership requires a matching verified applicant and project role'; end if;
 if new.status='confirmed' and not exists(select 1 from public.website_project_teams where id=new.team_id and accepting_members and status in ('forming','active')) then raise exception 'Team is not accepting members'; end if;
 return new;
end $$;
revoke all on function public.website_validate_pilot_member() from public,anon,authenticated;
create trigger website_validate_pilot_member before insert or update on public.website_project_team_members for each row execute function public.website_validate_pilot_member();
create function public.website_pilot_activity_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare ref text;
begin
 if pg_trigger_depth()>1 then return null; end if;
 if tg_table_name='website_project_teams' then
  if tg_op='UPDATE' and new.project_ref<>old.project_ref then raise exception 'Team project is immutable'; end if;
  ref:=case when tg_op='DELETE' then old.project_ref else new.project_ref end;
 else
  select project_ref into ref from public.website_project_teams where id=case when tg_op='DELETE' then old.team_id else new.team_id end;
 end if;
 update public.website_project_pilot_settings set activity_recorded=true where project_ref=ref;
 perform public.website_reconcile_pilot_teams(ref);
 return null;
end $$;
revoke all on function public.website_pilot_activity_changed() from public,anon,authenticated;
create trigger website_pilot_team_changed after insert or update or delete on public.website_project_teams for each row execute function public.website_pilot_activity_changed();
create trigger website_pilot_member_changed after insert or update or delete on public.website_project_team_members for each row execute function public.website_pilot_activity_changed();
create function public.website_public_pilot_activity() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('project_ref',s.project_ref,'recorded',s.activity_recorded,'max_active_teams',s.max_active_teams,
 'active_teams',(select count(*) from public.website_project_teams t where t.project_ref=s.project_ref and t.status='active'),
 'forming_teams',(select count(*) from public.website_project_teams t where t.project_ref=s.project_ref and t.status='forming'),
 'active_contributors',(select count(distinct m.user_id) from public.website_project_team_members m join public.website_project_teams t on t.id=m.team_id where t.project_ref=s.project_ref and t.status='active' and m.status='confirmed'),
 'teams',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'label',t.label,'status',t.status,'minimum_members',t.minimum_members,'required_roles',t.required_roles,'accepting_members',t.accepting_members,'members',(select count(*) from public.website_project_team_members m where m.team_id=t.id and m.status='confirmed'),'filled_roles',coalesce((select jsonb_agg(distinct m.role) from public.website_project_team_members m where m.team_id=t.id and m.status='confirmed'),'[]'::jsonb)) order by t.created_at,t.id) from public.website_project_teams t where t.project_ref=s.project_ref),'[]'::jsonb)) order by s.project_ref),'[]'::jsonb) from public.website_project_pilot_settings s;
$$;
revoke all on function public.website_public_pilot_activity() from public;
grant execute on function public.website_public_pilot_activity() to anon,authenticated,service_role;

create function public.website_validate_pilot_team() returns trigger language plpgsql security definer set search_path='' as $$
declare cap integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.project_ref,0));
 if exists(select 1 from unnest(new.required_roles) r where not exists(select 1 from public.website_project_briefs b where b.project_ref=new.project_ref and b.roles ? r)) then raise exception 'Required role is not in this project'; end if;
 if new.status='active' and (tg_op='INSERT' or old.status<>'active') then
  select max_active_teams into cap from public.website_project_pilot_settings where project_ref=new.project_ref;
  if (select count(*) from public.website_project_teams where project_ref=new.project_ref and status='active' and id<>new.id)>=cap then raise exception 'Active team capacity reached'; end if;
  if (select count(*) from public.website_project_team_members where team_id=new.id and status='confirmed')<new.minimum_members or exists(select 1 from unnest(new.required_roles) r where not exists(select 1 from public.website_project_team_members m where m.team_id=new.id and m.status='confirmed' and m.role=r)) then raise exception 'Team starting requirements not met'; end if;
  new.started_at:=coalesce(new.started_at,now());
 end if;
 return new;
end $$;
revoke all on function public.website_validate_pilot_team() from public,anon,authenticated;
create trigger website_validate_pilot_team before insert or update on public.website_project_teams for each row execute function public.website_validate_pilot_team();
