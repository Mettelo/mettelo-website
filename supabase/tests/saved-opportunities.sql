-- Synthetic integration test; rolls back every row. Staging only.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('10000000-0000-4000-8000-000000000201','saved-one@example.test',now(),'{}'),
('10000000-0000-4000-8000-000000000202','saved-two@example.test',now(),'{}');
insert into public.opportunities(id,title,opportunity_type,status,access_level,data_ai_relevance_status,published_at,closes_at) values
('20000000-0000-4000-8000-000000000201','Rollback open','job','published','public','high',now()-interval '1 day',now()+interval '1 day'),
('20000000-0000-4000-8000-000000000202','Rollback closed','job','published','public','high',now()-interval '2 days',now()-interval '1 day'),
('20000000-0000-4000-8000-000000000203','Rollback draft','job','draft','public','high',now()-interval '1 day',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000201',true);
insert into public.saved_opportunities(user_id,opportunity_id) values(auth.uid(),'20000000-0000-4000-8000-000000000201');
insert into public.saved_opportunities(user_id,opportunity_id) values(auth.uid(),'20000000-0000-4000-8000-000000000201') on conflict(user_id,opportunity_id) do nothing;
do $$ begin
 assert (select count(*) from public.saved_opportunities)=1;
 begin insert into public.saved_opportunities(user_id,opportunity_id) values(auth.uid(),'20000000-0000-4000-8000-000000000202'); raise exception 'Closed save accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.saved_opportunities(user_id,opportunity_id) values(auth.uid(),'20000000-0000-4000-8000-000000000203'); raise exception 'Draft save accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.saved_opportunities(user_id,opportunity_id) values('10000000-0000-4000-8000-000000000202','20000000-0000-4000-8000-000000000201'); raise exception 'Other owner save accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000202',true);
do $$ declare affected integer; begin
 assert (select count(*) from public.saved_opportunities)=0;
 delete from public.saved_opportunities where user_id='10000000-0000-4000-8000-000000000201';
 get diagnostics affected=row_count;assert affected=0;
end $$;
reset role;
update public.opportunities set status='archived' where id='20000000-0000-4000-8000-000000000201';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000201',true);
do $$ begin
 assert (select count(*) from public.saved_opportunities)=1;
 assert not exists(select 1 from public.opportunities where id='20000000-0000-4000-8000-000000000201');
 delete from public.saved_opportunities where opportunity_id='20000000-0000-4000-8000-000000000201';
 assert (select count(*) from public.saved_opportunities)=0;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.saved_opportunities;raise exception 'Anonymous saved access accepted';exception when insufficient_privilege then null;end;
end $$;
rollback;
