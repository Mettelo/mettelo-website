begin;
create temp table people_fixture_ids(key text,id uuid);
grant select on people_fixture_ids to authenticated;
create temp table people_checks(check_name text,passed boolean);
grant all on people_checks to authenticated;
insert into people_fixture_ids select x,gen_random_uuid() from unnest(array['actor','member','hidden','viewer'])x;
insert into people_fixture_ids select 'follower-'||n,gen_random_uuid() from generate_series(1,30)n;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
 select id,'people-rollback-'||id||'@example.invalid',now(),jsonb_build_object('full_name','[ROLLBACK PEOPLE] '||key) from people_fixture_ids;
insert into private_website_lab.market_preferences(user_id,discoverable,contactable)
 select id,key<>'hidden',false from people_fixture_ids;
update public.profiles p set full_name='[ROLLBACK PEOPLE] '||f.key,avatar_path=p.id||'/'||gen_random_uuid()||'.webp' from people_fixture_ids f where f.id=p.id;
insert into private_website_lab.market_follows(follower_id,followed_id)
 select id,(select id from people_fixture_ids where key='actor') from people_fixture_ids where key='member' or key='hidden' or key like 'follower-%';
insert into private_website_lab.market_follows values((select id from people_fixture_ids where key='actor'),(select id from people_fixture_ids where key='member'),now());
insert into storage.objects(bucket_id,name) select 'website-profile-photos',p.avatar_path from public.profiles p join people_fixture_ids f on f.id=p.id where f.key in ('actor','hidden');
select set_config('request.jwt.claim.sub',(select id::text from people_fixture_ids where key='viewer'),true);
set local role authenticated;
do $test$
declare a uuid;h uuid;r jsonb;s jsonb;v bigint;ignored public.profiles;
begin
 select id into a from people_fixture_ids where key='actor';select id into h from people_fixture_ids where key='hidden';
 r:=public.website_market_discovery('connections',jsonb_build_object('member_id',a));
 s:=public.website_market_discovery('connections',jsonb_build_object('member_id',a,'page',2));
 if (r->>'followers')::int<>31 or (r->>'following')::int<>1 or jsonb_array_length(r->'rows')<>25 or jsonb_array_length(s->'rows')<>6 then raise exception 'Connections pagination/counts failed % %',r,s;end if;
 if exists(select 1 from jsonb_array_elements(r->'rows')x join jsonb_array_elements(s->'rows')y on x->>'id'=y->>'id') then raise exception 'Duplicate connection pages';end if;
 begin perform public.website_market_discovery('connections',jsonb_build_object('member_id',h));raise exception 'Hidden profile exposed';exception when insufficient_privilege then null;end;
 r:=public.website_market_discovery('avatar',jsonb_build_object('member_id',a));if r->>'path' is null then raise exception 'Shared avatar unavailable';end if;
 s:=public.website_market_discovery('avatar',jsonb_build_object('member_id',h));if s->>'path' is not null then raise exception 'Hidden avatar exposed';end if;
 if (select count(*) from storage.objects where bucket_id='website-profile-photos' and name=r->>'path')<>1 then raise exception 'Shared storage read failed';end if;
 if exists(select 1 from storage.objects where bucket_id='website-profile-photos' and name like h::text||'/%') then raise exception 'Hidden storage object exposed';end if;
 insert into people_checks values('31 shared followers paginate 25/6; hidden profiles excluded; photo RLS allows only shared current photos',true);
 perform set_config('request.jwt.claim.sub',a::text,true);
 r:=public.website_lab_market('people',jsonb_build_object('q','[ROLLBACK PEOPLE] member'));if not (r->'rows'->0->>'following')::boolean then raise exception 'Directory follow state missing';end if;
 r:=public.website_market_discovery('suggestions');if exists(select 1 from jsonb_array_elements(r->'rows')x where x->>'id' in(a::text,(select id::text from people_fixture_ids where key='member'),h::text)) then raise exception 'Suggestion exclusion failed';end if;
 select profile_version into v from public.profiles where id=a;
 ignored:=public.save_website_profile('{"education_qualification":"BSc","education_institution":"Rollback University","education_subject":"Computing","education_period":"2020–2024","education_additional":"Other training, 2025"}',v,false);
 if ignored.education_institution<>'Rollback University' or ignored.profile_version<>v+1 then raise exception 'Education did not save';end if;
 begin perform public.save_website_profile('{"education_subject":"Stale"}',v,false);raise exception 'Stale update accepted';exception when serialization_failure then null;end;
 begin perform public.save_website_profile(jsonb_build_object('education_subject',repeat('x',161)),v+1,false);raise exception 'Oversized education accepted';exception when invalid_parameter_value then null;end;
 perform public.save_website_profile('{"education_subject":""}',v+1,false);
 if (select education_subject from public.profiles where id=a) is not null or (select education_institution from public.profiles where id=a)<>'Rollback University' then raise exception 'Education clearing/partial save failed';end if;
 insert into people_checks values('Suggestions exclude self/already-followed/hidden; directory follow state; education saves, clears and rejects stale/oversized edits',true);
end $test$;
reset role;
insert into private_website_lab.market_blocks values((select id from people_fixture_ids where key='viewer'),(select id from people_fixture_ids where key='actor'),now());
select set_config('request.jwt.claim.sub',(select id::text from people_fixture_ids where key='viewer'),true);
set local role authenticated;
do $test$declare a uuid;r jsonb;begin
 select id into a from people_fixture_ids where key='actor';
 r:=public.website_market_discovery('avatar',jsonb_build_object('member_id',a));if r->>'path' is not null then raise exception 'Blocked photo exposed';end if;
 begin perform public.website_market_discovery('connections',jsonb_build_object('member_id',a));raise exception 'Blocked connections exposed';exception when insufficient_privilege then null;end;
 if exists(select 1 from storage.objects where bucket_id='website-profile-photos' and name like a::text||'/%') then raise exception 'Blocked storage photo exposed';end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.website_market_discovery('connections',jsonb_build_object('member_id',a));raise exception 'Unauthenticated connections exposed';exception when insufficient_privilege then null;end;
 insert into people_checks values('Blocks revoke connection and avatar reads; unauthenticated connection reads rejected',true);
end $test$;
reset role;
select * from people_checks;
rollback;
