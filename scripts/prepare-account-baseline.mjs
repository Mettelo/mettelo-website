import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const website=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=process.argv[2];
if(!source)throw new Error('Provide the reviewed platform checkout path.');
if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!=='4c80cec7d0a6cf6614ec9d0ed0af1e6beaac347f')throw new Error('Platform revision differs from reviewed source.');
if(execFileSync('git',['status','--porcelain'],{cwd:source,encoding:'utf8'}).trim())throw new Error('Platform source checkout must be clean.');
const launch=readFileSync(resolve(source,'supabase/migrations/20260809_launch_readiness.sql'),'utf8').replaceAll('\r\n','\n');
const identity=readFileSync(resolve(source,'supabase/migrations/20260905090000_project_experience_phase_1_member_identity.sql'),'utf8').replaceAll('\r\n','\n');
const start=launch.indexOf('create table if not exists public.profiles');
const end=launch.indexOf('create table if not exists public.form_submissions');
const policies=launch.slice(launch.indexOf('create policy "profiles readable by owner"'),launch.indexOf('-- form_submissions and newsletter_subscribers'));
const trigger=launch.slice(launch.indexOf('drop trigger if exists on_auth_user_created'));
if(start<0||end<=start||!policies.includes('with check')||!trigger.includes('after insert on auth.users'))throw new Error('Canonical source markers changed; review extraction.');
const sql=`-- STAGING-ONLY account slice transferred from Mettelo/mettelo-platform.
-- Source revision: 4c80cec7d0a6cf6614ec9d0ed0af1e6beaac347f.
-- Existing profiles are intentionally refused. This is not a production upgrade.
do $guard$ begin
  if to_regclass('public.profiles') is not null then
    raise exception 'Account baseline requires an empty isolated schema';
  end if;
end $guard$;
${launch.slice(start,end)}
alter table public.profiles enable row level security;
${policies}
${identity}
${trigger}
-- Explicit grants for new projects; trigger functions are not callable RPCs.
revoke all on table public.profiles from public, anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
revoke all on sequence public.mettelo_member_number_seq from public, anon, authenticated;
revoke all on function public.assign_member_id() from public, anon, authenticated;
revoke all on function public.protect_member_identity_fields() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.claim_member_username(text) from public, anon;
grant execute on function public.claim_member_username(text) to authenticated;
`;
const target=resolve(website,'supabase/migrations/20261101200056_v2_account_identity_baseline.sql');
writeFileSync(target,sql);
console.log(JSON.stringify({migration:target,sha256:createHash('sha256').update(sql).digest('hex'),bytes:Buffer.byteLength(sql)}));
