-- Rollback-only synthetic integration assertions. Run only on V2 staging.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values ('10000000-0000-4000-8000-000000000101','profile-one@example.test',now(),'{"full_name":"Profile One"}'),
('10000000-0000-4000-8000-000000000102','profile-two@example.test',now(),'{"full_name":"Profile Two"}'),
('10000000-0000-4000-8000-000000000103','profile-unverified@example.test',null,'{}');
insert into private_member_onboarding.members(normalized_email,draft)
values ('profile-one@example.test','{"bio":"Synthetic draft","location":"Test City","email":"must not return","whatsapp":"must not return"}'),
('profile-two@example.test','{"bio":"Other member draft"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000101',true);
do $$ declare result jsonb; saved public.profiles; begin
 result:=public.get_my_profile_prefill();
 assert result->>'state'='available';
 assert result->'draft'->>'bio'='Synthetic draft';
 assert not(result->'draft'?'email') and not(result->'draft'?'whatsapp');
 saved:=public.save_website_profile('{"bio":"Reviewed bio","location":"Test City"}',0,true);
 assert saved.profile_version=1 and saved.full_name='Profile One';
 saved:=public.save_website_profile('{"headline":"New headline"}',1,false);
 assert saved.bio='Reviewed bio' and saved.location='Test City';
 begin perform public.save_website_profile('{"bio":"stale overwrite"}',1,false); raise exception 'Stale write accepted'; exception when serialization_failure then null; end;
 begin perform public.save_website_profile('{"username":"changed"}',2,false); raise exception 'Identity edit accepted'; exception when invalid_parameter_value then null; end;
 begin update public.profiles set bio='bypass' where id=auth.uid(); raise exception 'Direct update accepted'; exception when insufficient_privilege then null; end;
 assert (select count(*) from public.profiles)=1;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000102',true);
do $$ begin assert public.get_my_profile_prefill()->'draft'->>'bio'='Other member draft'; end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000103',true);
do $$ begin
 begin perform public.get_my_profile_prefill(); raise exception 'Unverified prefill accepted'; exception when insufficient_privilege then null; end;
 begin perform public.save_website_profile('{"full_name":"Unverified"}',0,false); raise exception 'Unverified save accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin assert (select claimed_by from private_member_onboarding.members where normalized_email='profile-one@example.test')='10000000-0000-4000-8000-000000000101'::uuid; end $$;
update private_member_onboarding.members set needs_review=true where normalized_email='profile-two@example.test';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000102',true);
do $$ begin assert public.get_my_profile_prefill()->>'state'='review_required'; end $$;
set local role anon;
do $$ begin
 begin perform public.get_my_profile_prefill(); raise exception 'Anon RPC accepted'; exception when insufficient_privilege then null; end;
 begin perform 1 from private_member_onboarding.members; raise exception 'Source read accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: owner privacy, prefill filtering, explicit claim, partial save, stale rejection, verified-only access, no raw writes; synthetic fixtures rolled back' as result;
