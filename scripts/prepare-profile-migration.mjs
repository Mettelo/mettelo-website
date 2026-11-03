import fs from 'node:fs/promises';
import {profileFields} from '../apps/member/lib/profile-contract.mjs';
const migration=process.argv[2];
if(!migration?.match(/^supabase\/migrations\/\d+_v2_private_profile_review\.sql$/))throw new Error('Pass the CLI-created profile migration path.');
const keys=profileFields.map(f=>`'${f.key}'`).join(',');
const sql=`-- Isolated website staging only. Platform field names retained; no production import.
do $$ begin if current_setting('app.settings.project_ref',true) is not null and current_setting('app.settings.project_ref',true)<>'jxijdjmjuzslmjxolhjl' then raise exception 'STAGING_ONLY'; end if; end $$;
alter table public.profiles
${profileFields.filter(f=>!['full_name','location','professional_area','primary_goal'].includes(f.key)).map(f=>`add column ${f.key} text,`).join('\n')}
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
 select coalesce(jsonb_object_agg(key,value),'{}') into clean from jsonb_each(source.draft) where key in (${keys}) and jsonb_typeof(value)='string';
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
  if pair.key not in (${keys}) or jsonb_typeof(pair.value)<>'string' then raise exception 'INVALID_PROFILE_FIELD' using errcode='22023'; end if;
  max_length:=case pair.key ${profileFields.map(f=>`when '${f.key}' then ${f.max}`).join(' ')} end;
  if length(btrim(p_patch->>pair.key))>max_length then raise exception 'PROFILE_FIELD_TOO_LONG' using errcode='22023'; end if;
  if pair.key like '%_url' and btrim(p_patch->>pair.key)<>'' and (p_patch->>pair.key !~ '^https://[^[:space:]/?#]+[^[:space:]]*$' or p_patch->>pair.key ~ '^https://[^/]*@') then raise exception 'INVALID_PROFILE_URL' using errcode='22023'; end if;
 end loop;
 ${profileFields.filter(f=>f.options).map(f=>`if coalesce(p_patch->>'${f.key}','')<>'' and p_patch->>'${f.key}' not in (${f.options.map(o=>`'${o.replaceAll("'","''")}'`).join(',')}) then raise exception 'INVALID_PROFILE_CHOICE' using errcode='22023'; end if;`).join('\n')}
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
 ${profileFields.map(f=>`${f.key}=case when p_patch?'${f.key}' then nullif(btrim(p_patch->>'${f.key}'),'') else current_profile.${f.key} end`).join(',\n')},
 profile_version=current_profile.profile_version+1,updated_at=clock_timestamp(),profile_completed_at=coalesce(current_profile.profile_completed_at,now())
 where id=auth.uid() returning * into saved;
 return saved;
end $$;
revoke all on function public.save_website_profile(jsonb,bigint,boolean) from public,anon;
grant execute on function public.save_website_profile(jsonb,bigint,boolean) to authenticated;
revoke insert,update,delete on public.profiles from anon,authenticated;
`;
await fs.writeFile(migration,sql);
console.log('Prepared private profile and prefill migration; no source members included.');
