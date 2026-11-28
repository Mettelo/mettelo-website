-- Replace __OFFSET__ with 0 or 1; execute in independent sessions concurrently.
begin;
set local lock_timeout='15s';
create temp table invitation_race_result(backend integer,started timestamptz,finished timestamptz,outcome text);
do $race$
declare uid uuid;rid uuid;started timestamptz:=clock_timestamp();
begin
 select id into uid from auth.users where email like 'uat-invitation-race-member-%@example.invalid';
 select id into rid from private_website_lab.market_requests where member_id=uid order by id offset __OFFSET__ limit 1;
 if uid is null or rid is null then raise exception 'Missing isolated invitation fixture';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 begin
  perform public.website_lab_market('accept',jsonb_build_object('request_id',rid));
  -- Hold the successful transaction open so the other session must contend.
  perform pg_sleep(5);
  insert into invitation_race_result values(pg_backend_pid(),started,clock_timestamp(),'accepted');
 exception when raise_exception then
  if sqlerrm not like 'Lab participation limit reached%' then raise;end if;
  insert into invitation_race_result values(pg_backend_pid(),started,clock_timestamp(),'blocked at allowance');
 end;
end $race$;
select * from invitation_race_result;
commit;
