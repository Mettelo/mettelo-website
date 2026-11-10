alter table public.profiles add column avatar_path text;
alter table public.profiles add constraint website_avatar_owned_path check(avatar_path is null or
 (split_part(avatar_path,'/',1)=id::text and avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'));
grant update(avatar_path) on public.profiles to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('website-profile-photos','website-profile-photos',false,1048576,array['image/webp']);
create policy website_photo_read on storage.objects for select to authenticated
using(bucket_id='website-profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy website_photo_upload on storage.objects for insert to authenticated
with check(bucket_id='website-profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy website_photo_remove on storage.objects for delete to authenticated
using(bucket_id='website-profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
