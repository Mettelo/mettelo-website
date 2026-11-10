-- Website staging pipeline storage; additive, no source/platform changes.
alter table public.opportunities drop constraint opportunities_status_check;
alter table public.opportunities add constraint opportunities_status_check check(status in ('draft','published','archived','expired'));
alter table public.opportunities
 add column external_job_id text unique,
 add column slug text,
 add column original_published_at timestamptz,
 add column discovered_at timestamptz,
 add column updated_at timestamptz not null default now(),
 add column next_verification_at timestamptz,
 add column verification_failure_count integer not null default 0 check(verification_failure_count>=0),
 add column last_verification_error text,
 add column verification_score integer check(verification_score between 0 and 100),
 add column verification_reasons jsonb not null default '[]',
 add column review_required boolean not null default true,
 add column rejection_reason text,
 add column publication_mode text not null default 'manual' check(publication_mode in ('manual','auto')),
 add column classification_version text,
 add column eligible_countries jsonb not null default '[]',
 add column eligibility_status text not null default 'unknown',
 add column employer_domain text,
 add column suspicion_score integer check(suspicion_score between 0 and 100),
 add column expired_at timestamptz;
create schema private_opportunity_pipeline;
revoke all on schema private_opportunity_pipeline from public,anon,authenticated;
grant usage on schema private_opportunity_pipeline to service_role;
create table private_opportunity_pipeline.runs(
 id uuid primary key,
 fingerprint text not null,
 finished_at timestamptz not null default now(),
 summary jsonb not null
);
create table private_opportunity_pipeline.verification_checks(
 id uuid primary key default gen_random_uuid(),
 run_id uuid references private_opportunity_pipeline.runs(id),
 opportunity_id uuid not null references public.opportunities(id) on delete cascade,
 check_type text not null,
 result text not null,
 detail text not null,
 created_at timestamptz not null default now()
);
alter table private_opportunity_pipeline.runs enable row level security;
alter table private_opportunity_pipeline.verification_checks enable row level security;
revoke all on all tables in schema private_opportunity_pipeline from public,anon,authenticated;
grant select,insert on all tables in schema private_opportunity_pipeline to service_role;
grant select,insert,update on public.opportunities to service_role;
create index website_pipeline_checks_opportunity on private_opportunity_pipeline.verification_checks(opportunity_id);
create index website_pipeline_checks_run on private_opportunity_pipeline.verification_checks(run_id);

create function public.website_publish_opportunity_batch(p_run_id uuid,p_candidates jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare candidate jsonb; row_data public.opportunities; previous private_opportunity_pipeline.runs;
 changed_id uuid; written integer:=0; rejected integer:=0; protected integer:=0; report jsonb;
begin
 if p_run_id is null or jsonb_typeof(p_candidates)<>'array' or jsonb_array_length(p_candidates)>500 then
  raise exception 'Invalid pipeline batch' using errcode='22023';
 end if;
 if not pg_try_advisory_xact_lock(726384105) then raise exception 'Pipeline already running' using errcode='55P03'; end if;
 select * into previous from private_opportunity_pipeline.runs where id=p_run_id;
 if found then
  if previous.fingerprint<>md5(p_candidates::text) then raise exception 'Run ID reused with different data' using errcode='22023'; end if;
  return previous.summary;
 end if;
 insert into private_opportunity_pipeline.runs(id,fingerprint,summary) values(p_run_id,md5(p_candidates::text),'{}');
 for candidate in select value from jsonb_array_elements(p_candidates) loop
  if jsonb_typeof(candidate)<>'object' then raise exception 'Invalid candidate' using errcode='22023';end if;
  row_data:=jsonb_populate_record(null::public.opportunities,candidate);
  if row_data.external_job_id is null or row_data.external_job_id!~'^(arbeitnow|remotive|adzuna|jooble):[^[:space:]]+$'
   or coalesce(length(row_data.title),0) not between 1 and 300
   or coalesce(length(row_data.organisation),0)=0
   or coalesce(row_data.data_ai_relevance_score,0)<85 or row_data.data_ai_relevance_status is distinct from 'high'
   or coalesce(row_data.source_url,'')!~'^https://[^/@[:space:]]+([/:?][^[:space:]]*)?$'
   or coalesce(row_data.official_application_url,row_data.source_url)!~'^https://[^/@[:space:]]+([/:?][^[:space:]]*)?$'
   or row_data.original_published_at is null or row_data.original_published_at<now()-interval '7 days'
   or row_data.original_published_at>now()
   or (row_data.closes_at is not null and row_data.closes_at<=now()) then rejected:=rejected+1;continue;end if;
  insert into public.opportunities(external_job_id,title,organisation,opportunity_type,summary,location,
   source_url,official_application_url,closes_at,published_at,last_verified_at,verification_status,
   data_ai_relevance_score,data_ai_relevance_status,role_family,source_type,source_organisation,
   country_code,region_code,applicant_scope,work_arrangement,remote_scope,sponsorship_status,
   original_published_at,discovered_at,next_verification_at,publication_mode,classification_version,review_required,status,access_level)
  values(row_data.external_job_id,row_data.title,row_data.organisation,coalesce(row_data.opportunity_type,'job'),
   left(row_data.summary,700),row_data.location,row_data.source_url,coalesce(row_data.official_application_url,row_data.source_url),
   row_data.closes_at,now(),now(),'source_feed',row_data.data_ai_relevance_score,'high',row_data.role_family,
   'discovery_'||split_part(row_data.external_job_id,':',1),row_data.source_organisation,row_data.country_code,row_data.region_code,
   coalesce(row_data.applicant_scope,'unknown'),row_data.work_arrangement,row_data.remote_scope,
   coalesce(row_data.sponsorship_status,'not_stated'),row_data.original_published_at,now(),now()+interval '1 day',
   'auto',row_data.classification_version,false,'published','public')
  on conflict(external_job_id) do update set
   title=excluded.title,organisation=excluded.organisation,summary=excluded.summary,
   location=excluded.location,source_url=excluded.source_url,official_application_url=excluded.official_application_url,
   closes_at=excluded.closes_at,original_published_at=excluded.original_published_at,
   last_verified_at=now(),next_verification_at=excluded.next_verification_at,
   verification_failure_count=0,last_verification_error=null,
   data_ai_relevance_score=excluded.data_ai_relevance_score,data_ai_relevance_status='high',
   status='published',expired_at=null,updated_at=now(),
   country_code=excluded.country_code,region_code=excluded.region_code,
   sponsorship_status=excluded.sponsorship_status,applicant_scope=excluded.applicant_scope,
   work_arrangement=excluded.work_arrangement,remote_scope=excluded.remote_scope
  where opportunities.publication_mode='auto' and opportunities.status<>'archived'
  returning id into changed_id;
  if changed_id is null then protected:=protected+1;else
   written:=written+1;
   insert into private_opportunity_pipeline.verification_checks(run_id,opportunity_id,check_type,result,detail)
   values(p_run_id,changed_id,'source_feed','pass','Source feed candidate accepted by website publication rules; employer availability not independently guaranteed.');
  end if;
 end loop;
 report:=jsonb_build_object('written',written,'rejected',rejected,'protected',protected);
 update private_opportunity_pipeline.runs set summary=report,finished_at=now() where id=p_run_id;
 return report;
end $$;

create function public.website_expire_opportunities()
returns integer language plpgsql security invoker set search_path='' as $$
declare affected integer;
begin
 if not pg_try_advisory_xact_lock(726384105) then raise exception 'Pipeline already running' using errcode='55P03';end if;
 with expired as (
 update public.opportunities set status='expired',verification_status='expired',expired_at=now(),updated_at=now(),
 next_verification_at=null
 where status='published' and (
 (closes_at is not null and closes_at<=now()) or
 (publication_mode='auto' and last_verified_at<now()-interval '14 days'))
 returning id)
 insert into private_opportunity_pipeline.verification_checks(opportunity_id,check_type,result,detail)
 select id,'lifecycle_expiry','fail','Published deadline passed or discovery source has not refreshed the listing for fourteen days.' from expired;
 get diagnostics affected=row_count;return affected;
end $$;
revoke all on function public.website_publish_opportunity_batch(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.website_expire_opportunities() from public,anon,authenticated;
grant execute on function public.website_publish_opportunity_batch(uuid,jsonb) to service_role;
grant execute on function public.website_expire_opportunities() to service_role;
