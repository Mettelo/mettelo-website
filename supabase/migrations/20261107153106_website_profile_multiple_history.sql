begin;
alter table public.profiles add column education_entries jsonb not null default '[]'::jsonb check(jsonb_typeof(education_entries)='array' and jsonb_array_length(education_entries)<=20);
alter table public.profiles add column experience_entries jsonb not null default '[]'::jsonb check(jsonb_typeof(experience_entries)='array' and jsonb_array_length(experience_entries)<=20);
update public.profiles set education_entries=jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'qualification',coalesce(education_qualification,''),'institution',coalesce(education_institution,''),'subject',coalesce(education_subject,''),'period',coalesce(education_period,''),'description',coalesce(education_additional,'')))
where concat(education_qualification,education_institution,education_subject,education_period,education_additional)<>'';
create function private_website_lab.validate_profile_history(entries jsonb,kind text) returns jsonb language plpgsql set search_path='' as $$
declare entry jsonb;item jsonb;output jsonb:='[]';key text;value text;keys text[];bounds integer[];i integer;ids text[]:='{}';eid text;
begin
 if kind='education_entries' then keys:=array['qualification','institution','subject','period','description'];bounds:=array[160,200,160,80,1500];
 elsif kind='experience_entries' then keys:=array['title','organisation','location','period','description'];bounds:=array[160,200,120,80,1500];
 else raise exception 'INVALID_HISTORY_KIND' using errcode='22023';end if;
 if jsonb_typeof(entries) is distinct from 'array' or jsonb_array_length(entries)>20 then raise exception 'INVALID_PROFILE_HISTORY' using errcode='22023';end if;
 for entry in select * from jsonb_array_elements(entries) loop
  if jsonb_typeof(entry) is distinct from 'object' then raise exception 'INVALID_HISTORY_ENTRY' using errcode='22023';end if;
  for key in select jsonb_object_keys(entry) loop
   if key<>'id' and not key=any(keys) then raise exception 'INVALID_HISTORY_FIELD' using errcode='22023';end if;
   if jsonb_typeof(entry->key) is distinct from 'string' then raise exception 'INVALID_HISTORY_TEXT' using errcode='22023';end if;
  end loop;
  eid:=coalesce(entry->>'id',gen_random_uuid()::text);
  if eid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or eid=any(ids) then raise exception 'INVALID_HISTORY_ID' using errcode='22023';end if;
  ids:=array_append(ids,eid);item:=jsonb_build_object('id',eid);
  for i in 1..cardinality(keys) loop
   value:=btrim(coalesce(entry->>keys[i],''));if length(value)>bounds[i] then raise exception 'HISTORY_FIELD_TOO_LONG' using errcode='22023';end if;
   item:=item||jsonb_build_object(keys[i],value);
  end loop;
  if not exists(select 1 from jsonb_each_text(item) where key<>'id' and value<>'') then raise exception 'EMPTY_HISTORY_ENTRY' using errcode='22023';end if;
  output:=output||jsonb_build_array(item);
 end loop;
 return output;
end $$;
revoke all on function private_website_lab.validate_profile_history(jsonb,text) from public,anon,authenticated;
do $adapt$
declare src text;needle text:='for pair in select * from jsonb_each(p_patch) loop';
begin
 src:=pg_get_functiondef('public.save_website_profile(jsonb,bigint,boolean)'::regprocedure);
 if strpos(src,needle)=0 then raise exception 'Profile dispatcher changed';end if;
 src:=replace(src,needle,needle||'
  if pair.key in (''education_entries'',''experience_entries'') then perform private_website_lab.validate_profile_history(pair.value,pair.key);continue;end if;');
 src:=replace(src,'profile_version=current_profile.profile_version+1',
 'education_entries=case when p_patch?''education_entries'' then private_website_lab.validate_profile_history(p_patch->''education_entries'',''education_entries'') else current_profile.education_entries end,
 experience_entries=case when p_patch?''experience_entries'' then private_website_lab.validate_profile_history(p_patch->''experience_entries'',''experience_entries'') else current_profile.experience_entries end,
 profile_version=current_profile.profile_version+1');
 execute src;
end $adapt$;
commit;
