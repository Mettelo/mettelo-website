begin;
update private_website_lab.participation_policy set lab_allowance=3,version=version+1,updated_at=now() where id;
-- Missing configuration must deny new commitments rather than imply no limit.
create or replace function private_website_lab.participation_allowance(uid uuid) returns integer language sql stable security definer set search_path='' as $$
 select coalesce((select lab_allowance from private_website_lab.participation_entitlements where user_id=uid and (valid_until is null or valid_until>now())),(select lab_allowance from private_website_lab.participation_policy where id),0)
$$;
revoke all on function private_website_lab.participation_allowance(uuid) from public,anon,authenticated;
commit;
