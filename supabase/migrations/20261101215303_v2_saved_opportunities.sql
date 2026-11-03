create table public.saved_opportunities (
 user_id uuid not null references auth.users(id) on delete cascade,
 opportunity_id uuid not null references public.opportunities(id) on delete cascade,
 saved_at timestamptz not null default now(),
 primary key(user_id,opportunity_id)
);
alter table public.saved_opportunities enable row level security;
revoke all on public.saved_opportunities from anon,authenticated;
grant select,insert,delete on public.saved_opportunities to authenticated;
create policy website_saved_read on public.saved_opportunities for select to authenticated using((select auth.uid())=user_id);
create policy website_saved_remove on public.saved_opportunities for delete to authenticated using((select auth.uid())=user_id);
create policy website_saved_add on public.saved_opportunities for insert to authenticated with check(
 (select auth.uid())=user_id and exists(
 select 1 from public.opportunities o where o.id=opportunity_id and o.status='published' and o.access_level='public'
 and o.data_ai_relevance_status='high' and o.published_at<=now() and (o.closes_at is null or o.closes_at>now())
 ));
create index website_saved_opportunity_fk on public.saved_opportunities(opportunity_id);
comment on table public.saved_opportunities is 'Private website member shortlist. Owner-only read/add/remove; no reminders or employer application tracking.';
