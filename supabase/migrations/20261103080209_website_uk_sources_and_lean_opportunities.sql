begin;
create or replace function public.website_publish_opportunity_batch(p_run_id uuid,p_candidates jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare candidate jsonb; row_data public.opportunities; previous private_opportunity_pipeline.runs;
 changed_id uuid; written integer:=0; rejected integer:=0; protected integer:=0; report jsonb;
begin
 if p_run_id is null or p_candidates is null or jsonb_typeof(p_candidates)<>'array' or jsonb_array_length(p_candidates)>500 then
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
  if row_data.external_job_id is null or row_data.external_job_id!~'^(arbeitnow|remotive|adzuna|jooble|nhs|civilservice):[^[:space:]]+$'
   or coalesce(length(row_data.title),0) not between 1 and 300
   or coalesce(length(row_data.organisation),0)=0
   or coalesce(row_data.data_ai_relevance_score,0)<85 or row_data.data_ai_relevance_status is distinct from 'high'
   or coalesce(row_data.source_url,'')!~'^https://[^/@[:space:]]+([/:?][^[:space:]]*)?$'
   or coalesce(row_data.official_application_url,row_data.source_url)!~'^https://[^/@[:space:]]+([/:?][^[:space:]]*)?$'
   or row_data.original_published_at is null or (row_data.original_published_at<now()-interval '7 days' and (row_data.closes_at is null or row_data.closes_at<=now()))
   or row_data.original_published_at>now()
   or (row_data.closes_at is not null and row_data.closes_at<=now()) then rejected:=rejected+1;continue;end if;
  insert into public.opportunities(external_job_id,title,organisation,opportunity_type,summary,location,
   source_url,official_application_url,closes_at,published_at,last_verified_at,verification_status,
   data_ai_relevance_score,data_ai_relevance_status,role_family,source_type,source_organisation,
   country_code,region_code,applicant_scope,work_arrangement,remote_scope,sponsorship_status,
   original_published_at,discovered_at,next_verification_at,publication_mode,classification_version,review_required,status,access_level)
  values(row_data.external_job_id,row_data.title,row_data.organisation,coalesce(row_data.opportunity_type,'job'),
   left(row_data.summary,320),row_data.location,row_data.source_url,coalesce(row_data.official_application_url,row_data.source_url),
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

create or replace function public.website_record_source_check(p_check_id uuid,p_opportunity_id uuid,p_expected_url text,p_state text,p_http_status integer default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item public.opportunities; previous private_opportunity_pipeline.verification_checks;
 failures integer; report jsonb; closed boolean:=false;
begin
 if p_check_id is null or p_opportunity_id is null or p_state is null or p_state not in ('active','missing','absent_feed','transient','skipped') then raise exception 'Invalid check' using errcode='22023';end if;
 if p_state='active' and (p_http_status is null or p_http_status<200 or p_http_status>=300) then raise exception 'Invalid active response' using errcode='22023';end if;
 if p_state='missing' and (p_http_status is null or p_http_status not in (404,410)) then raise exception 'Invalid missing response' using errcode='22023';end if;
 if p_state='absent_feed' and (p_http_status is distinct from 200 or coalesce(p_expected_url,'')!~'^https://(www[.]|beta[.])?jobs[.]nhs[.]uk/candidate/jobadvert/[A-Za-z0-9-]+/?$') then raise exception 'Invalid feed absence' using errcode='22023';end if;
 if not pg_try_advisory_xact_lock(726384105) then raise exception 'Pipeline already running' using errcode='55P03';end if;
 select * into previous from private_opportunity_pipeline.verification_checks where id=p_check_id;
 if found then
  if previous.opportunity_id<>p_opportunity_id or previous.outcome is null then raise exception 'Check ID conflict' using errcode='22023';end if;
  return previous.outcome;
 end if;
 select * into item from public.opportunities where id=p_opportunity_id for update;
 if not found or item.status<>'published' then return jsonb_build_object('applied',false,'reason','not_published');end if;
 if coalesce(item.official_application_url,item.source_url) is distinct from p_expected_url then return jsonb_build_object('applied',false,'reason','source_changed');end if;
 if item.next_verification_at>now() then return jsonb_build_object('applied',false,'reason','not_due');end if;
 failures:=item.verification_failure_count;
 if p_state='active' then
  update public.opportunities set last_verified_at=now(),next_verification_at=now()+interval '1 day',verification_failure_count=0,last_verification_error=null,updated_at=now() where id=item.id;
  failures:=0;
 elsif p_state in ('missing','absent_feed') then
  failures:=failures+1;closed:=failures>=2;
  update public.opportunities set verification_failure_count=failures,
   status=case when closed then 'expired' else status end,
   verification_status=case when closed then 'expired' else verification_status end,
   expired_at=case when closed then now() else expired_at end,
   next_verification_at=case when closed then null else now()+interval '6 hours' end,
   last_verification_error='Source repeatedly returned missing advert or exact NHS feed absence',updated_at=now() where id=item.id;
 else
  update public.opportunities set next_verification_at=now()+interval '1 day',
   last_verification_error=case when p_state='skipped' then 'Source outside reviewed registry' else 'Temporary source response' end,
   updated_at=now() where id=item.id;
 end if;
 report:=jsonb_build_object('applied',true,'expired',closed,'failures',failures,'state',p_state);
 insert into private_opportunity_pipeline.verification_checks(id,opportunity_id,check_type,result,detail,outcome)
 values(p_check_id,item.id,'source_availability',p_state,'Website source availability check; not an employer or outcome guarantee.',report);
 return report;
end $$;
revoke all on function public.website_record_source_check(uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.website_record_source_check(uuid,uuid,text,text,integer) to service_role;

commit;
