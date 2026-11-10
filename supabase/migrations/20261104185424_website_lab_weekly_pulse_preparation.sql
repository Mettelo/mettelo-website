begin;
-- Preparation only: this queue has no delivery state or provider integration.
create table private_website_lab.weekly_pulse_preparations(
 team_id uuid not null references public.website_project_teams(id),
 user_id uuid not null references auth.users(id),
 week_start date not null,
 prepared_at timestamptz not null default now(),
 primary key(team_id,user_id,week_start)
);
alter table private_website_lab.weekly_pulse_preparations enable row level security;
revoke all on private_website_lab.weekly_pulse_preparations from public,anon,authenticated;

-- Service-only worker needs a bounded read of private activity; members cannot call it.
create function private_website_lab.weekly_pulse(p_action text,p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path='' as $$
declare r record; result jsonb:='[]'; summary jsonb; week_date date;
 cutoff timestamptz; previous_cutoff timestamptz; inserted integer;
begin
 if p_action not in ('preview','prepare') or p_action is null then raise exception 'Weekly pulse supports preparation only';end if;
 if p_now is null or p_now>now()+interval '5 minutes' then raise exception 'Invalid pulse date';end if;
 week_date:=date_trunc('week',p_now at time zone 'Europe/London')::date;
 cutoff:=week_date::timestamp at time zone 'Europe/London';
 previous_cutoff:=(week_date-7)::timestamp at time zone 'Europe/London';
 for r in
  select t.id team_id,t.project_ref,t.label team_label,m.user_id,u.email
  from public.website_project_teams t
  join public.website_project_team_members m on m.team_id=t.id
  join auth.users u on u.id=m.user_id
  where t.status='active' and t.lab_enabled and t.participation='team'
    and m.status='confirmed' and m.admitted_at is not null and m.external_access_revoked_at is null
    and u.email_confirmed_at is not null and u.email is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=p_now)
  order by t.id,m.user_id
 loop
  if p_action='prepare' then
   insert into private_website_lab.weekly_pulse_preparations(team_id,user_id,week_start)
   values(r.team_id,r.user_id,week_date) on conflict do nothing;
   get diagnostics inserted=row_count;
   if inserted=0 then continue;end if;
  end if;
  select jsonb_build_object(
   'tasks_completed',(select count(*) from private_website_lab.items i where i.team_id=r.team_id and i.kind='task' and i.status='done' and i.deleted_at is null
    and exists(select 1 from private_website_lab.audit a where a.team_id=r.team_id and a.action='task_status' and a.payload->>'task_id'=i.id::text and a.payload->>'status'='done' and a.created_at>=previous_cutoff and a.created_at<cutoff)),
   'milestones_completed',(select count(*) from private_website_lab.items i where i.team_id=r.team_id and i.kind='milestone' and i.status='done' and i.deleted_at is null and i.milestone_accepted_at>=previous_cutoff and i.milestone_accepted_at<cutoff),
   'next_milestone',(select i.title from private_website_lab.items i where i.team_id=r.team_id and i.kind='milestone' and i.status<>'done' and i.deleted_at is null order by i.created_at,i.id limit 1),
   'blockers',coalesce((select jsonb_agg(x.title order by x.created_at,x.id) from (select i.id,i.title,i.created_at from private_website_lab.items i where i.team_id=r.team_id and i.kind='task' and i.status='blocked' and i.deleted_at is null order by i.created_at,i.id limit 3)x),'[]'),
   'blocker_count',(select count(*) from private_website_lab.items i where i.team_id=r.team_id and i.kind='task' and i.status='blocked' and i.deleted_at is null)
  ) into summary;
  result:=result||jsonb_build_array(to_jsonb(r)||summary||jsonb_build_object('week_start',week_date,'period_start',previous_cutoff,'period_end',cutoff));
 end loop;
 return result;
end $$;
revoke all on function private_website_lab.weekly_pulse(text,timestamptz) from public,anon,authenticated;
grant execute on function private_website_lab.weekly_pulse(text,timestamptz) to service_role;
create function public.website_lab_weekly_pulse(p_action text,p_now timestamptz default now()) returns jsonb
language sql security invoker set search_path='' as $$select private_website_lab.weekly_pulse(p_action,p_now)$$;
revoke all on function public.website_lab_weekly_pulse(text,timestamptz) from public,anon,authenticated;
grant execute on function public.website_lab_weekly_pulse(text,timestamptz) to service_role;
comment on function public.website_lab_weekly_pulse(text,timestamptz) is 'Service-only weekly project pulse preview/preparation. No sending, delivery worker or schedule enabled.';
commit;
