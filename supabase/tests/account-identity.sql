-- Execute only on the approved isolated project jxijdjmjuzslmjxolhjl.
-- Rollback-only synthetic database contract test; not email/browser evidence.
begin;
do $guard$ begin
  if to_regclass('private_member_onboarding.source_submissions') is not null then
    raise exception 'Refusing a database containing the production onboarding source store';
  end if;
end $guard$;
create temporary table v2_fixture_ids(label text primary key,id uuid not null);
grant select on v2_fixture_ids to authenticated;
with inserted as (
  insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
  values
    (gen_random_uuid(),'v2-contract-a@example.test','{"full_name":"Synthetic member A"}','{}'),
    (gen_random_uuid(),'v2-contract-b@example.test','{"full_name":"Synthetic member B"}','{}')
  returning id,email
)
insert into v2_fixture_ids(label,id)
select case when email='v2-contract-a@example.test' then 'a' else 'b' end,id from inserted;
do $test$ begin
  if (select count(*) from public.profiles where id in(select id from v2_fixture_ids))<>2 then raise exception 'Signup profile trigger failed'; end if;
  if (select count(distinct member_id) from public.profiles where id in(select id from v2_fixture_ids) and member_id ~ '^MTL-[0-9]{6,}$')<>2 then raise exception 'Stable member IDs missing'; end if;
end $test$;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from v2_fixture_ids where label='a'),true);
do $test$ declare result record; begin
  if (select count(*) from public.profiles)<>1 then raise exception 'Member A private read isolation failed'; end if;
  select * into result from public.claim_member_username('V2_TEST_ALPHA');
  if not result.success or result.claimed_username<>'v2_test_alpha' then raise exception 'Canonical claim/normalization failed'; end if;
  select * into result from public.claim_member_username('different_name');
  if result.code<>'ALREADY_CLAIMED' then raise exception 'Claim idempotency failed'; end if;
  begin
    update public.profiles set member_id='MTL-999999' where id=auth.uid();
    raise exception 'Immutable identity update was allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set full_name='Wrong owner' where id=(select id from v2_fixture_ids where label='b');
    if found then raise exception 'Cross-member update succeeded'; end if;
  exception when insufficient_privilege then null; end;
end $test$;
select set_config('request.jwt.claim.sub',(select id::text from v2_fixture_ids where label='b'),true);
do $test$ declare result record; begin
  if (select count(*) from public.profiles)<>1 then raise exception 'Member B private read isolation failed'; end if;
  select * into result from public.claim_member_username('admin');
  if result.code<>'RESERVED' then raise exception 'Reserved username was accepted'; end if;
end $test$;
-- Canonical two-second claim cooldown must not be bypassed in test assertions.
reset role;
update public.profiles set username_claim_attempted_at=now()-interval '3 seconds' where id=(select id from v2_fixture_ids where label='b');
set local role authenticated;
do $test$ declare result record; begin
  select * into result from public.claim_member_username('v2_test_alpha');
  if result.code<>'UNAVAILABLE' then raise exception 'Duplicate username accepted'; end if;
end $test$;
set local role anon;
do $test$ begin
  begin
    perform count(*) from public.profiles;
    raise exception 'Anonymous private profiles read allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.claim_member_username('v2_anonymous');
    raise exception 'Anonymous identity RPC allowed';
  exception when insufficient_privilege then null; end;
end $test$;
reset role;
rollback;
select 'PASS: signup trigger, member IDs, ownership, claim normalization/idempotency, reserved/duplicate protection and anonymous denial' as result,
  (select count(*) from auth.users where email in ('v2-contract-a@example.test','v2-contract-b@example.test')) as remaining_synthetic_users;
