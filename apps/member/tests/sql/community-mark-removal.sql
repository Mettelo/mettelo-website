begin;
create temp table mark_results(check_name text,passed boolean);
do $test$
declare actor uuid:=gen_random_uuid();peer uuid:=gen_random_uuid();fixture_post uuid:=gen_random_uuid();mark_kind text;r jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(actor,'mark-'||actor||'@example.invalid',now(),'{"full_name":"Rollback mark actor"}'),(peer,'mark-'||peer||'@example.invalid',now(),'{"full_name":"Rollback mark peer"}');
 insert into private_website_lab.market_posts(id,author_id,kind,body,client_nonce) values(fixture_post,peer,'update','Isolated reversible bookmark and like fixture.',gen_random_uuid());
 insert into private_website_lab.market_post_marks(post_id,user_id,kind) values(fixture_post,peer,'bookmark');
 perform set_config('request.jwt.claim.sub',actor::text,true);
 foreach mark_kind in array array['like','bookmark'] loop
  perform public.website_lab_community(mark_kind,jsonb_build_object('post_id',fixture_post,'enabled',true));
  perform public.website_lab_community(mark_kind,jsonb_build_object('post_id',fixture_post,'enabled',true));
  assert (select count(*)=1 from private_website_lab.market_post_marks m where m.post_id=fixture_post and m.user_id=actor and m.kind=mark_kind),'Enabling must create exactly one mark';
  perform public.website_lab_community(mark_kind,jsonb_build_object('post_id',fixture_post,'enabled',false));
  perform public.website_lab_community(mark_kind,jsonb_build_object('post_id',fixture_post,'enabled',false));
  assert not exists(select 1 from private_website_lab.market_post_marks m where m.post_id=fixture_post and m.user_id=actor and m.kind=mark_kind),'Disabling did not remove the current member mark';
 end loop;
 assert exists(select 1 from private_website_lab.market_post_marks m where m.post_id=fixture_post and m.user_id=peer and m.kind='bookmark'),'Removal touched another member mark';
 r:=public.website_lab_community('feed','{"view":"bookmarks"}');assert not exists(select 1 from jsonb_array_elements(r->'rows')x where x->>'id'=fixture_post::text),'Removed bookmark remains in Saved';
 insert into mark_results values('Like/bookmark enable and disable are idempotent, scoped to the actor, and persisted Saved results agree',true);
end $test$;
select * from mark_results;
rollback;
