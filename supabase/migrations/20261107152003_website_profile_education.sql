begin;
alter table public.profiles add column education_qualification text check (education_qualification is null or length(education_qualification)<=160);
alter table public.profiles add column education_institution text check (education_institution is null or length(education_institution)<=200);
alter table public.profiles add column education_subject text check (education_subject is null or length(education_subject)<=160);
alter table public.profiles add column education_period text check (education_period is null or length(education_period)<=80);
alter table public.profiles add column education_additional text check (education_additional is null or length(education_additional)<=1500);
do $adapt$
declare src text;old text;
begin
 src:=pg_get_functiondef('public.save_website_profile(jsonb,bigint,boolean)'::regprocedure);old:=src;
 src:=replace(src,'''problem_interests'',''community_contribution'')','''problem_interests'',''community_contribution'',''education_qualification'',''education_institution'',''education_subject'',''education_period'',''education_additional'')');
 src:=replace(src,'when ''community_contribution'' then 1000 end','when ''community_contribution'' then 1000 when ''education_qualification'' then 160 when ''education_institution'' then 200 when ''education_subject'' then 160 when ''education_period'' then 80 when ''education_additional'' then 1500 end');
 src:=replace(src,'profile_version=current_profile.profile_version+1','education_qualification=case when p_patch?''education_qualification'' then nullif(btrim(p_patch->>''education_qualification''),'''') else current_profile.education_qualification end,
education_institution=case when p_patch?''education_institution'' then nullif(btrim(p_patch->>''education_institution''),'''') else current_profile.education_institution end,
education_subject=case when p_patch?''education_subject'' then nullif(btrim(p_patch->>''education_subject''),'''') else current_profile.education_subject end,
education_period=case when p_patch?''education_period'' then nullif(btrim(p_patch->>''education_period''),'''') else current_profile.education_period end,
education_additional=case when p_patch?''education_additional'' then nullif(btrim(p_patch->>''education_additional''),'''') else current_profile.education_additional end,profile_version=current_profile.profile_version+1');
 if src=old or strpos(src,'''education_qualification''')=0 then raise exception 'Profile dispatcher changed';end if;
 execute src;
end $adapt$;
commit;
