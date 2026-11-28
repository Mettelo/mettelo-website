-- Isolated website staging only. Platform field names retained; no production import.
do $$ begin if current_setting('app.settings.project_ref',true) is not null and current_setting('app.settings.project_ref',true)<>'jxijdjmjuzslmjxolhjl' then raise exception 'STAGING_ONLY'; end if; end $$;
alter table public.profiles
add column headline text,
add column current_job_title text,
add column organisation text,
add column experience_level text,
add column bio text,
add column linkedin_url text,
add column github_url text,
add column portfolio_url text,
add column profile_version bigint not null default 0,
add column profile_completed_at timestamptz;
create schema if not exists private_member_onboarding;
revoke all on schema private_member_onboarding from public,anon,authenticated,service_role;
create table private_member_onboarding.members (
 normalized_email text primary key check(normalized_email=lower(btrim(normalized_email))),
 draft jsonb not null default '{}' check(jsonb_typeof(draft)='object'),
 needs_review boolean not null default false,
 claimed_by uuid unique references auth.users(id), claimed_at timestamptz
);
alter table private_member_onboarding.members enable row level security;
revoke all on private_member_onboarding.members from public,anon,authenticated,service_role;
-- This definer function only returns the verified caller's own source. No email argument.
create function public.get_my_profile_prefill() returns jsonb language plpgsql security definer set search_path='' as $$
declare account_email text; source private_member_onboarding.members%rowtype; clean jsonb;
begin
 select lower(btrim(email)) into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if account_email is null then raise exception 'VERIFIED_ACCOUNT_REQUIRED' using errcode='42501'; end if;
 select * into source from private_member_onboarding.members where normalized_email=account_email;
 if not found or (source.claimed_by is not null and source.claimed_by<>auth.uid()) then return jsonb_build_object('state','none'); end if;
 if source.needs_review then return jsonb_build_object('state','review_required'); end if;
 select coalesce(jsonb_object_agg(key,value),'{}') into clean from jsonb_each(source.draft) where key in ('full_name','headline','location','professional_area','current_job_title','organisation','experience_level','bio','primary_goal','linkedin_url','github_url','portfolio_url') and jsonb_typeof(value)='string';
 return jsonb_build_object('state','available','draft',clean);
end $$;
revoke all on function public.get_my_profile_prefill() from public,anon;
grant execute on function public.get_my_profile_prefill() to authenticated;
-- Narrow definer writes are necessary because direct browser table writes are revoked.
-- Owner comes only from auth.uid(); row lock + version protects concurrent saves.
create function public.save_website_profile(p_patch jsonb,p_expected_version bigint,p_use_prefill boolean default false)
returns public.profiles language plpgsql security definer set search_path='' as $$
declare current_profile public.profiles%rowtype; account_email text; pair record; max_length int; saved public.profiles%rowtype;
begin
 select lower(btrim(email)) into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if account_email is null then raise exception 'VERIFIED_ACCOUNT_REQUIRED' using errcode='42501'; end if;
 if p_patch is null or jsonb_typeof(p_patch)<>'object' then raise exception 'INVALID_PROFILE' using errcode='22023'; end if;
 for pair in select * from jsonb_each(p_patch) loop
  if pair.key not in ('full_name','headline','location','professional_area','current_job_title','organisation','experience_level','bio','primary_goal','linkedin_url','github_url','portfolio_url') or jsonb_typeof(pair.value)<>'string' then raise exception 'INVALID_PROFILE_FIELD' using errcode='22023'; end if;
  max_length:=case pair.key when 'full_name' then 120 when 'headline' then 160 when 'location' then 120 when 'professional_area' then 80 when 'current_job_title' then 140 when 'organisation' then 160 when 'experience_level' then 20 when 'bio' then 1000 when 'primary_goal' then 200 when 'linkedin_url' then 300 when 'github_url' then 300 when 'portfolio_url' then 300 end;
  if length(btrim(p_patch->>pair.key))>max_length then raise exception 'PROFILE_FIELD_TOO_LONG' using errcode='22023'; end if;
  if pair.key like '%_url' and btrim(p_patch->>pair.key)<>'' and (p_patch->>pair.key !~ '^https://[^[:space:]/?#]+[^[:space:]]*$' or p_patch->>pair.key ~ '^https://[^/]*@') then raise exception 'INVALID_PROFILE_URL' using errcode='22023'; end if;
 end loop;
 if coalesce(p_patch->>'professional_area','')<>'' and p_patch->>'professional_area' not in ('Data Analysis / BI','Data Science / ML','Data Engineering','AI / Generative AI','Analytics Engineering','Research / Product / Design','Career transition / Student','Other') then raise exception 'INVALID_PROFILE_CHOICE' using errcode='22023'; end if;
if coalesce(p_patch->>'experience_level','')<>'' and p_patch->>'experience_level' not in ('entry','mid','senior','lead','executive') then raise exception 'INVALID_PROFILE_CHOICE' using errcode='22023'; end if;
 select * into current_profile from public.profiles where id=auth.uid() for update;
 if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
 if p_expected_version is null or current_profile.profile_version<>p_expected_version then raise exception 'PROFILE_STALE' using errcode='40001'; end if;
 if coalesce(nullif(btrim(case when p_patch?'full_name' then p_patch->>'full_name' else current_profile.full_name end),''),'')='' then raise exception 'FULL_NAME_REQUIRED' using errcode='22023'; end if;
 if p_use_prefill then
  perform 1 from private_member_onboarding.members where normalized_email=account_email and not needs_review and (claimed_by is null or claimed_by=auth.uid()) for update;
  if not found then raise exception 'PREFILL_UNAVAILABLE' using errcode='40001'; end if;
  update private_member_onboarding.members set claimed_by=auth.uid(),claimed_at=coalesce(claimed_at,now()) where normalized_email=account_email;
 end if;
 update public.profiles set
 full_name=case when p_patch?'full_name' then nullif(btrim(p_patch->>'full_name'),'') else current_profile.full_name end,
headline=case when p_patch?'headline' then nullif(btrim(p_patch->>'headline'),'') else current_profile.headline end,
location=case when p_patch?'location' then nullif(btrim(p_patch->>'location'),'') else current_profile.location end,
professional_area=case when p_patch?'professional_area' then nullif(btrim(p_patch->>'professional_area'),'') else current_profile.professional_area end,
current_job_title=case when p_patch?'current_job_title' then nullif(btrim(p_patch->>'current_job_title'),'') else current_profile.current_job_title end,
organisation=case when p_patch?'organisation' then nullif(btrim(p_patch->>'organisation'),'') else current_profile.organisation end,
experience_level=case when p_patch?'experience_level' then nullif(btrim(p_patch->>'experience_level'),'') else current_profile.experience_level end,
bio=case when p_patch?'bio' then nullif(btrim(p_patch->>'bio'),'') else current_profile.bio end,
primary_goal=case when p_patch?'primary_goal' then nullif(btrim(p_patch->>'primary_goal'),'') else current_profile.primary_goal end,
linkedin_url=case when p_patch?'linkedin_url' then nullif(btrim(p_patch->>'linkedin_url'),'') else current_profile.linkedin_url end,
github_url=case when p_patch?'github_url' then nullif(btrim(p_patch->>'github_url'),'') else current_profile.github_url end,
portfolio_url=case when p_patch?'portfolio_url' then nullif(btrim(p_patch->>'portfolio_url'),'') else current_profile.portfolio_url end,
 profile_version=current_profile.profile_version+1,updated_at=clock_timestamp(),profile_completed_at=coalesce(current_profile.profile_completed_at,now())
 where id=auth.uid() returning * into saved;
 return saved;
end $$;
revoke all on function public.save_website_profile(jsonb,bigint,boolean) from public,anon;
grant execute on function public.save_website_profile(jsonb,bigint,boolean) to authenticated;
revoke insert,update,delete on public.profiles from anon,authenticated;
