-- Tighten direct API insertion to the same saved 80% requirement as the website.
-- Existing interests are retained. Apply to the website database before release.
begin;
drop policy if exists website_interest_profile_threshold on public.website_project_interests;
create policy website_interest_profile_threshold on public.website_project_interests
as restrictive for insert to authenticated
with check ((select public.website_my_profile_completion()) >= 80);
commit;
