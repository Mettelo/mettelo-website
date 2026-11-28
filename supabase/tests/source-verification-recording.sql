begin;
insert into public.opportunities(id,title,organisation,opportunity_type,source_url,official_application_url,status,access_level,data_ai_relevance_status,published_at)
values('30000000-0000-4000-8000-000000000601','[ROLLBACK TEST] Data Engineer','Synthetic','job','https://remotive.com/test','https://remotive.com/test','published','public','high',now()-interval '1 day');
set local role service_role;
do $$ declare record_id uuid:='30000000-0000-4000-8000-000000000601';first_id uuid:=gen_random_uuid();result jsonb; begin
 result:=public.website_record_source_check(first_id,record_id,'https://remotive.com/changed','missing',404);
 assert result->>'reason'='source_changed';
 result:=public.website_record_source_check(first_id,record_id,'https://remotive.com/test','missing',404);
 assert result->>'expired'='false' and result->>'failures'='1';
 assert public.website_record_source_check(first_id,record_id,'https://remotive.com/test','missing',404)=result;
 result:=public.website_record_source_check(gen_random_uuid(),record_id,'https://remotive.com/test','missing',410);
 assert result->>'reason'='not_due';
 update public.opportunities set next_verification_at=now()-interval '1 second' where id=record_id;
 result:=public.website_record_source_check(gen_random_uuid(),record_id,'https://remotive.com/test','transient',429);
 assert result->>'failures'='1' and result->>'expired'='false';
 update public.opportunities set next_verification_at=now()-interval '1 second' where id=record_id;
 result:=public.website_record_source_check(gen_random_uuid(),record_id,'https://remotive.com/test','active',200);
 assert result->>'failures'='0';
 update public.opportunities set next_verification_at=now()-interval '1 second' where id=record_id;
 perform public.website_record_source_check(gen_random_uuid(),record_id,'https://remotive.com/test','missing',404);
 update public.opportunities set next_verification_at=now()-interval '1 second' where id=record_id;
 result:=public.website_record_source_check(gen_random_uuid(),record_id,'https://remotive.com/test','missing',410);
 assert result->>'expired'='true';
 assert (select status from public.opportunities where id=record_id)='expired';
end $$;
set local role anon;
do $$ begin
 assert has_column_privilege('anon','public.opportunities','title','SELECT');
 assert not has_column_privilege('anon','public.opportunities','verification_failure_count','SELECT');
 assert not has_column_privilege('authenticated','public.opportunities','last_verification_error','SELECT');
 assert not has_function_privilege('authenticated','public.website_record_source_check(uuid,uuid,text,text,integer)','EXECUTE');
end $$;
rollback;
