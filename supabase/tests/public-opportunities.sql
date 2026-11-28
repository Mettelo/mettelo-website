begin;
insert into public.opportunities(title,opportunity_type,status,access_level,data_ai_relevance_status,published_at)
values ('[ROLLBACK TEST] hidden draft','job','draft','public','high',now()),
('[ROLLBACK TEST] hidden private','job','published','private','high',now()),
('[ROLLBACK TEST] hidden relevance','job','published','public','low',now()),
('[ROLLBACK TEST] hidden future','job','published','public','high',now()+interval '1 day');
set local role anon;
do $$ begin
 if exists(select 1 from public.opportunities where title like '[ROLLBACK TEST]%') then raise exception 'Unpublished rows exposed'; end if;
 if not exists(select 1 from public.opportunities where title like '[STAGING TEST]%') then raise exception 'Public feed inaccessible'; end if;
 if has_table_privilege('anon','public.opportunities','INSERT') or has_table_privilege('authenticated','public.opportunities','UPDATE') or has_table_privilege('authenticated','public.opportunities','DELETE') then raise exception 'Browser writes allowed'; end if;
end $$;
rollback;
