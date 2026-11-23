-- Bounded population diagnostic: each page has a five-second stop.
-- Setup is limited to65s and further samples stop at95s total.
-- No fixture is committed and no admission lock is disabled.
begin;
set local statement_timeout='65s';
create temp table growth_times(surface text,page integer,elapsed_ms numeric,payload_bytes integer,row_count integer);
create temp table growth_summary(key text,value numeric);
create temp table growth_context(staff uuid,population integer,token text);
create temp table growth_failures(surface text,page integer,reason text);
create temp table growth_first(surface text primary key,ids uuid[]);
insert into growth_summary values('started_epoch',extract(epoch from clock_timestamp()));
do $setup$
declare staff uuid;population integer:=coalesce(nullif(current_setting('mettelo.test_population',true),''),'20000')::integer;
 token text:='GrowthBench'||replace(gen_random_uuid()::text,'-','');started timestamptz:=clock_timestamp();
begin
 assert population in(20000,50000,100000),'Use a reviewed cohort';
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 assert staff is not null,'Staging administrator required';
 create temp table growth_people as select gen_random_uuid() id,n from generate_series(1,population)n;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
 select id,'growth-'||id||'@example.invalid',now(),jsonb_build_object('full_name',token||' Member '||lpad(n::text,6,'0')) from growth_people;
 update public.profiles p set headline='Synthetic data professional',skills='SQL, Python, Power BI',bio=repeat('Synthetic growth fixture. ',8) from growth_people g where p.id=g.id;
 insert into private_website_lab.market_preferences(user_id,discoverable) select id,true from growth_people;
 insert into private_website_lab.market_follows(follower_id,followed_id) select id,staff from growth_people;
 analyze auth.users;analyze public.profiles;analyze private_website_lab.market_preferences;analyze private_website_lab.market_follows;
 insert into growth_summary values('fixture_setup_ms',extract(epoch from clock_timestamp()-started)*1000),('population',population);
 insert into growth_context values(staff,population,token);
exception when query_canceled then
 insert into growth_failures values('fixture_setup',null,'Fixture setup exceeded65s; its partial writes were rolled back');
end $setup$;
create function pg_temp.growth_sample(section_name text,rep integer) returns void language plpgsql as $sample$
declare ctx growth_context;started timestamptz;page_no integer;r jsonb;ids uuid[];baseline uuid[];elapsed numeric;
begin
 if not exists(select 1 from growth_context) or exists(select 1 from growth_failures where surface=section_name) then return;end if;
 if extract(epoch from clock_timestamp())-(select value from growth_summary where key='started_epoch')>95 then
  insert into growth_failures values(section_name,null,'Total harness95s budget reached; remaining samples skipped');return;
 end if;
 select * into ctx from growth_context;
 perform set_config('request.jwt.claim.sub',ctx.staff::text,true);
 page_no:=case when rep%2=0 then 1 when section_name='people' then ctx.population/25 else ctx.population/50 end;
 started:=clock_timestamp();
 if section_name='people' then r:=public.website_lab_market('people',jsonb_build_object('q',ctx.token,'page',page_no));
 else r:=public.website_market_discovery('connections',jsonb_build_object('member_id',ctx.staff,'direction','followers','page',page_no));end if;
 elapsed:=extract(epoch from clock_timestamp()-started)*1000;
 assert (section_name<>'people' or (r->>'total')::int=ctx.population) and (section_name<>'connections' or (r->>'followers')::int>=ctx.population) and jsonb_array_length(r->'rows')=25,'Count or bounded response assertion failed';
 select array_agg((x->>'id')::uuid order by x->>'id') into ids from jsonb_array_elements(r->'rows')x;
 if rep=0 then insert into growth_first values(section_name,ids);
 else
  select f.ids into baseline from growth_first f where f.surface=section_name;
  assert (page_no<>1 or ids=baseline) and (page_no=1 or not ids&&baseline),'Page stability/overlap assertion failed';
  insert into growth_times values(section_name,page_no,elapsed,octet_length(r::text),jsonb_array_length(r->'rows'));
 end if;
exception when query_canceled then insert into growth_failures values(section_name,page_no,'One page request exceeded5s');
 when assert_failure then insert into growth_failures values(section_name,page_no,sqlerrm);
end $sample$;
set local statement_timeout='5s';
select pg_temp.growth_sample('people',0);
select pg_temp.growth_sample('people',1);
select pg_temp.growth_sample('people',2);
select pg_temp.growth_sample('people',3);
select pg_temp.growth_sample('people',4);
select pg_temp.growth_sample('people',5);
select pg_temp.growth_sample('people',6);
select pg_temp.growth_sample('people',7);
select pg_temp.growth_sample('people',8);
select pg_temp.growth_sample('people',9);
select pg_temp.growth_sample('people',10);
select pg_temp.growth_sample('connections',0);
select pg_temp.growth_sample('connections',1);
select pg_temp.growth_sample('connections',2);
select pg_temp.growth_sample('connections',3);
select pg_temp.growth_sample('connections',4);
select pg_temp.growth_sample('connections',5);
select pg_temp.growth_sample('connections',6);
select pg_temp.growth_sample('connections',7);
select pg_temp.growth_sample('connections',8);
select pg_temp.growth_sample('connections',9);
select pg_temp.growth_sample('connections',10);
select jsonb_build_object('population',(select value from growth_summary where key='population'),'setup_ms',(select value from growth_summary where key='fixture_setup_ms'),
 'complete',(select count(*)=20 from growth_times) and not exists(select 1 from growth_failures),
 'failures',coalesce((select jsonb_agg(to_jsonb(f)) from growth_failures f),'[]'::jsonb),
 'results',(select jsonb_agg(to_jsonb(x)) from(select surface,count(*) samples,round(percentile_cont(.5) within group(order by elapsed_ms)::numeric,2) p50_ms,
 case when count(*)=10 then round(percentile_cont(.95) within group(order by elapsed_ms)::numeric,2) end p95_ms,
 round(max(elapsed_ms),2) max_ms,max(row_count) max_rows,max(payload_bytes) max_payload_bytes from growth_times group by surface)x)) growth_diagnostic;
rollback;
analyze auth.users;analyze public.profiles;analyze private_website_lab.market_preferences;analyze private_website_lab.market_follows;

