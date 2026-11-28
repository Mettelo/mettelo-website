-- Use the existing self-scoped capability API. The private permitted(uuid,text)
-- helper is deliberately not executable by authenticated users.
alter policy website_content_asset_insert on storage.objects
with check (
 bucket_id='website-content-assets'
 and coalesce(((select public.website_admin_capabilities())->>'roles')::boolean,false)
 and (storage.foldername(name))[1]=(select auth.uid())::text
);
