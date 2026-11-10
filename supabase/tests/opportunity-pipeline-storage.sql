begin;
set local role service_role;
do $$ declare run_id uuid:=gen_random_uuid(); second_id uuid:=gen_random_uuid(); record_id uuid;
 candidate jsonb:=jsonb_build_object('external_job_id','arbeitnow:rollback-pipeline-test','title','[ROLLBACK TEST] Data Engineer',
 'organisation','Synthetic Pipeline','summary','SQL Python data pipelines','source_url','https://example.com/jobs/data',
 'opportunity_type','job','data_ai_relevance_score',90,'data_ai_relevance_status','high',
 'original_published_at',now()-interval '1 day');
 report jsonb;
begin
 report:=public.website_publish_opportunity_batch(run_id,jsonb_build_array(candidate));
 assert report->>'written'='1';
 assert public.website_publish_opportunity_batch(run_id,jsonb_build_array(candidate))=report;
 assert (select count(*) from public.opportunities where external_job_id='arbeitnow:rollback-pipeline-test')=1;
 report:=public.website_publish_opportunity_batch(second_id,jsonb_build_array(candidate));
 assert report->>'written'='1';
 assert (select count(*) from public.opportunities where external_job_id='arbeitnow:rollback-pipeline-test')=1;
 report:=public.website_publish_opportunity_batch(gen_random_uuid(),jsonb_build_array(candidate||'{"external_job_id":"arbeitnow:rollback-rejected","data_ai_relevance_score":10}'));
 assert report->>'rejected'='1';
 select id into record_id from public.opportunities where external_job_id='arbeitnow:rollback-pipeline-test';
 update public.opportunities set closes_at=now()-interval '1 day' where id=record_id;
 perform public.website_expire_opportunities();
 assert (select status from public.opportunities where id=record_id)='expired';
 report:=public.website_publish_opportunity_batch(gen_random_uuid(),jsonb_build_array(candidate));
 assert report->>'written'='1';
 assert (select status from public.opportunities where id=record_id)='published';
 update public.opportunities set status='archived' where id=record_id;
 report:=public.website_publish_opportunity_batch(gen_random_uuid(),jsonb_build_array(candidate));
 assert report->>'protected'='1';
 assert (select status from public.opportunities where id=record_id)='archived';
 update public.opportunities set status='draft',publication_mode='manual' where id=record_id;
 report:=public.website_publish_opportunity_batch(gen_random_uuid(),jsonb_build_array(candidate));
 assert report->>'protected'='1';
 assert (select status from public.opportunities where id=record_id)='draft';
end $$;
set local role anon;
do $$ begin
 assert not has_function_privilege('anon','public.website_publish_opportunity_batch(uuid,jsonb)','EXECUTE');
 assert not has_schema_privilege('anon','private_opportunity_pipeline','USAGE');
 assert not has_function_privilege('authenticated','public.website_expire_opportunities()','EXECUTE');
end $$;
rollback;
