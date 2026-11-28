-- Progressive growth diagnostic, not a production capacity certificate.
-- Population reads are separate from admissions: one huge membership transaction
-- exhausts the lock pool without representing ordinary concurrent usage.
-- All accounts, preferences and follow records roll back.
begin;
set local statement_timeout='115s';
create temp table growth_times(surface text,page integer,elapsed_ms numeric,payload_bytes integer,row_count integer);
create temp table growth_summary(key text,value numeric);
create temp table growth_context(staff uuid,population integer,token text);
do $test$
declare staff uuid;population integer:=coalesce(nullif(current_setting('mettelo.test_population',true),''),'20000')::integer;token text:='GrowthBench'||replace(gen_random_uuid()::text,'-','');started timestamptz;seed_started timestamptz:=clock_timestamp();r jsonb;section_name text;page_no integer;rep integer;first_ids uuid[];page_ids uuid[];
begin
 assert population in(20000,50000,100000),'Use a reviewed 20000, 50000 or 100000 member cohort';
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 create temp table growth_people as select gen_random_uuid() as id,n from generate_series(1,population)n;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
 select id,'growth-'||id||'@example.invalid',now(),jsonb_build_object('full_name',token||' Member '||lpad(n::text,6,'0')) from growth_people;
 update public.profiles p set headline='Synthetic data professional',skills='SQL, Python, Power BI',bio=repeat('Synthetic growth fixture. ',8) from growth_people g where p.id=g.id;
 insert into private_website_lab.market_preferences(user_id,discoverable) select id,true from growth_people;
 insert into private_website_lab.market_follows(follower_id,followed_id) select id,staff from growth_people;
 analyze auth.users;analyze public.profiles;analyze private_website_lab.market_preferences;analyze private_website_lab.market_follows;
 insert into growth_summary values('fixture_setup_ms',extract(epoch from clock_timestamp()-seed_started)*1000),('population',population);
 insert into growth_context values(staff,population,token);
end $test$;
-- Bound setup and read sampling independently. One cumulative DO timeout must
-- not be misreported as a single slow page request.
do $reads$
declare staff uuid;population integer;token text;started timestamptz;r jsonb;section_name text;page_no integer;rep integer;first_ids uuid[];page_ids uuid[];
begin
 select c.staff,c.population,c.token into staff,population,token from growth_context c;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 foreach section_name in array array['people','connections'] loop
  first_ids:=null;
  for rep in 0..10 loop
   page_no:=case when rep%2=0 then 1 when section_name='people' then population/25 else population/50 end;
   started:=clock_timestamp();
   if section_name='people' then r:=public.website_lab_market('people',jsonb_build_object('q',token,'page',page_no));else r:=public.website_market_discovery('connections',jsonb_build_object('member_id',staff,'direction','followers','page',page_no));end if;
   if (section_name='people' and (r->>'total')::int<>population) or (section_name='connections' and (r->>'followers')::int<population) or jsonb_array_length(r->'rows')<>25 then raise exception 'Growth dataset has incorrect count or unbounded % response',section_name;end if;
   select array_agg((x->>'id')::uuid order by x->>'id') into page_ids from jsonb_array_elements(r->'rows')x;
   if rep=0 then first_ids:=page_ids;
   elsif page_no=1 and page_ids<>first_ids then raise exception 'Unstable growth first page';
   elsif page_no<>1 and page_ids&&first_ids then raise exception 'Growth first and last pages overlap';end if;
   if rep>0 then insert into growth_times values(section_name,page_no,extract(epoch from clock_timestamp()-started)*1000,octet_length(r::text),jsonb_array_length(r->'rows'));end if;
  end loop;
 end loop;
 assert (select count(*)=population from growth_people),'Growth fixture coverage incomplete';
end $reads$;
select jsonb_build_object('population',(select value from growth_summary where key='population'),'synthetic_follows',(select value from growth_summary where key='population'),'warmup_requests_per_surface',1,'setup_ms',(select value from growth_summary where key='fixture_setup_ms'),'results',(select jsonb_agg(to_jsonb(x)) from(select surface,count(*) as samples,round(percentile_cont(0.5) within group(order by elapsed_ms)::numeric,2) as p50_ms,round(percentile_cont(0.95) within group(order by elapsed_ms)::numeric,2) as p95_ms,round(max(elapsed_ms),2) as max_ms,max(payload_bytes) as max_payload_bytes,max(row_count) as max_rows from growth_times group by surface order by surface)x)) as growth_diagnostic;
rollback;
-- Restore planner statistics for the retained staging dataset after rollback.
analyze auth.users;analyze public.profiles;analyze private_website_lab.market_preferences;analyze private_website_lab.market_follows;
