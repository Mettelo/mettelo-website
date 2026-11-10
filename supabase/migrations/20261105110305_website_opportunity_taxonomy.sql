begin;
alter table public.opportunities add column classification_details jsonb not null default '{}' check(jsonb_typeof(classification_details)='object');
-- Add structured evidence to the existing publication path, preserving its permissions,
-- advisory lock, immutable-run replay check, archive protection and expiry validation.
do $upgrade$
declare body text;before_text text;after_text text;
begin
 body:=pg_get_functiondef('public.website_publish_opportunity_batch(uuid,jsonb)'::regprocedure);
 before_text:='data_ai_relevance_score,data_ai_relevance_status,role_family,source_type,source_organisation,';
 after_text:='data_ai_relevance_score,data_ai_relevance_status,role_family,role_category,classification_details,source_type,source_organisation,';
 if strpos(body,before_text)=0 then raise exception 'Unexpected publication columns';end if;body:=replace(body,before_text,after_text);
 before_text:=$old$row_data.closes_at,now(),now(),'source_feed',row_data.data_ai_relevance_score,'high',row_data.role_family,$old$;
 after_text:=$new$row_data.closes_at,now(),now(),'source_feed',row_data.data_ai_relevance_score,'high',row_data.role_family,row_data.role_category,coalesce(row_data.classification_details,'{}'::jsonb),$new$;
 if strpos(body,before_text)=0 then raise exception 'Unexpected publication values';end if;body:=replace(body,before_text,after_text);
 before_text:=$old$data_ai_relevance_score=excluded.data_ai_relevance_score,data_ai_relevance_status='high',$old$;
 after_text:=$new$data_ai_relevance_score=excluded.data_ai_relevance_score,data_ai_relevance_status='high',
   role_family=excluded.role_family,role_category=excluded.role_category,classification_details=excluded.classification_details,classification_version=excluded.classification_version,$new$;
 if strpos(body,before_text)=0 then raise exception 'Unexpected publication update';end if;body:=replace(body,before_text,after_text);
 before_text:=$old$or coalesce(row_data.data_ai_relevance_score,0)<85 or row_data.data_ai_relevance_status is distinct from 'high'$old$;
 after_text:=before_text||$new$
   or (row_data.classification_version='mettelo-occupations-v8' and (
    row_data.classification_details->>'version' is distinct from 'mettelo-occupations-v8'
    or row_data.classification_details->>'eligible' is distinct from 'true'
    or row_data.classification_details->>'status' is distinct from 'high'
    or jsonb_typeof(row_data.classification_details->'categories') is distinct from 'array'
    or coalesce(jsonb_array_length(row_data.classification_details->'categories'),0) not between 1 and 21))$new$;
 if strpos(body,before_text)=0 then raise exception 'Unexpected publication eligibility';end if;body:=replace(body,before_text,after_text);
 execute body;
 body:=pg_get_functiondef('private_opportunity_pipeline.admin_control(text,jsonb)'::regprocedure);
 before_text:=$old$'sourceStats',payload->'sourceStats','createdAt',created_at$old$;
 after_text:=$new$'sourceStats',payload->'sourceStats','taxonomyVersion',payload->'taxonomyVersion','reviewCandidates',coalesce(payload->'reviewCandidates','[]'::jsonb),'createdAt',created_at$new$;
 if strpos(body,before_text)=0 then raise exception 'Unexpected prepared preview projection';end if;body:=replace(body,before_text,after_text);
 before_text:=$old$if exists(select 1 from private_opportunity_pipeline.prepared_batches where owner_id=actor and created_at>now()-interval '30 seconds')$old$;
 after_text:=$new$if p_payload->>'taxonomyVersion' is distinct from 'mettelo-occupations-v8' or jsonb_typeof(p_payload->'reviewCandidates') is distinct from 'array' or jsonb_array_length(p_payload->'reviewCandidates')>500 then raise exception 'Prepare a current taxonomy preview with a bounded review list';end if;
  if exists(select 1 from private_opportunity_pipeline.prepared_batches where owner_id=actor and created_at>now()-interval '30 seconds')$new$;
 if strpos(body,before_text)=0 then raise exception 'Unexpected preview preparation';end if;body:=replace(body,before_text,after_text);
 before_text:=$old$result:=public.website_publish_opportunity_batch(batch.id,batch.payload->'candidates');$old$;
 after_text:=$new$if batch.payload->>'taxonomyVersion' is distinct from 'mettelo-occupations-v8' then raise exception 'Search rules changed. Prepare a fresh preview before publishing.';end if;
  result:=public.website_publish_opportunity_batch(batch.id,batch.payload->'candidates');$new$;
 if strpos(body,before_text)=0 then raise exception 'Unexpected preview publication';end if;body:=replace(body,before_text,after_text);
 execute body;
end $upgrade$;
notify pgrst,'reload schema';
commit;
