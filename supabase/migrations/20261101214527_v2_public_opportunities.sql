create table public.opportunities (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 1 and 300),
 organisation text, opportunity_type text not null, summary text, location text, eligibility text,
 source_url text, official_application_url text, closes_at timestamptz,
 published_at timestamptz, last_verified_at timestamptz, verification_status text,
 data_ai_relevance_score integer check(data_ai_relevance_score between 0 and 100),
 role_family text, role_category text, remote_scope text, source_organisation text, source_type text,
 country_code text, region_code text, applicant_scope text not null default 'unknown',
 work_arrangement text, sponsorship_status text not null default 'unknown',
 status text not null default 'draft' check(status in ('draft','published','archived')),
 access_level text not null default 'private' check(access_level in ('private','public')),
 data_ai_relevance_status text not null default 'unknown',
 check(source_url is null or source_url ~ '^https://'),
 check(official_application_url is null or official_application_url ~ '^https://')
);
alter table public.opportunities enable row level security;
revoke all on public.opportunities from anon, authenticated;
grant select on public.opportunities to anon, authenticated;
create policy website_published_opportunities on public.opportunities for select to anon, authenticated
 using(status='published' and access_level='public' and data_ai_relevance_status='high' and published_at <= now());
create index website_opportunities_feed on public.opportunities(published_at desc) where status='published' and access_level='public' and data_ai_relevance_status='high';
comment on table public.opportunities is 'Website-owned opportunity feed. Browser roles have read-only access to published public high-relevance records; no platform DB connection.';
