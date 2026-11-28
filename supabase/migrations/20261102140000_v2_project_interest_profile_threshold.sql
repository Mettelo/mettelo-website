-- Owner-only saved score, with additive restrictive RLS for direct Data API inserts.
create or replace function public.website_my_profile_completion() returns integer
language sql stable security definer set search_path = '' as $$
 select coalesce((select 10*(case when nullif(btrim(p.full_name),'') is not null then 1 else 0 end+
case when nullif(btrim(p.headline),'') is not null then 1 else 0 end+
case when nullif(btrim(p.location),'') is not null then 1 else 0 end+
case when nullif(btrim(p.bio),'') is not null then 1 else 0 end+
case when nullif(btrim(p.current_job_title),'') is not null then 1 else 0 end+
case when nullif(btrim(p.primary_goal),'') is not null then 1 else 0 end+
case when nullif(btrim(p.avatar_path),'') is not null then 1 else 0 end+
case when p.professional_area in ('Data Analysis / BI','Data Science / ML','Data Engineering','AI / Generative AI','Analytics Engineering','Research / Product / Design','Career transition / Student','Other') then 1 else 0 end+
case when p.experience_level in ('entry','mid','senior','lead','executive') then 1 else 0 end+
case when (p.linkedin_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' or p.github_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' or p.portfolio_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$') then 1 else 0 end) from public.profiles p join auth.users u on u.id=p.id where p.id=(select auth.uid()) and u.email_confirmed_at is not null),0);
$$;
revoke all on function public.website_my_profile_completion() from public,anon;
grant execute on function public.website_my_profile_completion() to authenticated;
create policy website_interest_profile_threshold on public.website_project_interests as restrictive for insert to authenticated with check ((select public.website_my_profile_completion())>=70);
