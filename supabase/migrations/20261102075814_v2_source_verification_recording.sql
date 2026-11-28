-- Keep newly added pipeline-only fields out of anonymous/member data responses.
revoke select on public.opportunities from anon,authenticated;
grant select(id,title,organisation,opportunity_type,summary,location,eligibility,source_url,official_application_url,
closes_at,published_at,last_verified_at,verification_status,data_ai_relevance_score,role_family,role_category,
remote_scope,source_organisation,source_type,country_code,region_code,applicant_scope,work_arrangement,
sponsorship_status,status,access_level,data_ai_relevance_status) on public.opportunities to anon,authenticated;
alter table private_opportunity_pipeline.verification_checks add column outcome jsonb;
create function public.website_record_source_check(p_check_id uuid,p_opportunity_id uuid,p_expected_url text,p_state text,p_http_status integer default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item public.opportunities; previous private_opportunity_pipeline.verification_checks;
 failures integer; report jsonb; closed boolean:=false;
begin
 if p_check_id is null or p_opportunity_id is null or p_state is null or p_state not in ('active','missing','transient','skipped') then raise exception 'Invalid check' using errcode='22023';end if;
 if p_state='active' and (p_http_status is null or p_http_status<200 or p_http_status>=300) then raise exception 'Invalid active response' using errcode='22023';end if;
 if p_state='missing' and (p_http_status is null or p_http_status not in (404,410)) then raise exception 'Invalid missing response' using errcode='22023';end if;
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
 elsif p_state='missing' then
  failures:=failures+1;closed:=failures>=2;
  update public.opportunities set verification_failure_count=failures,
   status=case when closed then 'expired' else status end,
   verification_status=case when closed then 'expired' else verification_status end,
   expired_at=case when closed then now() else expired_at end,
   next_verification_at=case when closed then null else now()+interval '6 hours' end,
   last_verification_error='Source returned confirmed missing response',updated_at=now() where id=item.id;
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
