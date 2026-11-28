-- Isolated staging only. Metadata inserts are rolled back; no file is created.
begin;
select set_config('uat.content_admin',(select user_id::text from private_website_lab.member_roles where role='full_admin' and private_website_lab.permitted(user_id,'roles') limit 1),true),
 set_config('uat.content_member',(select id::text from auth.users where email_confirmed_at is not null and private_website_lab.account_allowed(id) and private_website_lab.assigned_role(id)='member' order by id limit 1),true);
set local role authenticated;
do $$
declare a uuid:=current_setting('uat.content_admin')::uuid;
 m uuid:=current_setting('uat.content_member')::uuid;
 denied boolean;
begin
 if a is null or m is null then raise exception 'Approved staging admin and member fixtures required';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.sub',a::text,true);
 insert into storage.objects(bucket_id,name) values('website-content-assets',a||'/uat-assets-'||gen_random_uuid()||'.webp');
 denied:=false;
 begin insert into storage.objects(bucket_id,name) values('website-content-assets',m||'/uat-assets-'||gen_random_uuid()||'.webp');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Administrator uploaded into another member folder';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',m,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.sub',m::text,true);
 denied:=false;
 begin insert into storage.objects(bucket_id,name) values('website-content-assets',m||'/uat-assets-'||gen_random_uuid()||'.webp');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Ordinary member uploaded website content';end if;
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;
 begin insert into storage.objects(bucket_id,name) values('website-content-assets',a||'/uat-assets-'||gen_random_uuid()||'.webp');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Missing identity uploaded website content';end if;
end $$;
reset role;
select 'administrator own-folder upload; foreign-folder, ordinary-member and missing-identity denials' as check_name,true as passed;
rollback;
