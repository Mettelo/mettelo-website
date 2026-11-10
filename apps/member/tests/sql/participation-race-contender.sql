-- Replace __OFFSET__ with 1 or 2; run both sessions concurrently and commit.
begin;
create temp table race_result(backend integer,started timestamptz,finished timestamptz,outcome text);
do $$
declare staff uuid;i public.website_project_interests;started timestamptz:=clock_timestamp();
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select a.* into i from public.website_project_interests a join auth.users u on u.id=a.user_id where u.email like 'participation-race-%@example.invalid' order by a.project_ref offset __OFFSET__ limit 1;
 if i.id is null then raise exception 'Missing race fixture';end if;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 begin
  perform public.website_lab('form_group',jsonb_build_object('project_ref',i.project_ref,'label','[PARTICIPATION RACE] Contender __OFFSET__','participation','solo','compatibility_reviewed','true','members',jsonb_build_array(jsonb_build_object('interest_id',i.id,'role',i.primary_role))));
  perform pg_sleep(5);
  insert into race_result values(pg_backend_pid(),started,clock_timestamp(),'admitted reservation');
 exception when raise_exception then
  if sqlerrm not like 'Lab participation limit reached%' then raise;end if;
  insert into race_result values(pg_backend_pid(),started,clock_timestamp(),'blocked at allowance');
 end;
end $$;
select * from race_result;
commit;
