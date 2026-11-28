-- Run using an operator connection on isolated staging. Every fixture rolls back.
-- No real source/contact records are included in this regression test.
begin;
set local statement_timeout='30s';
create temp table legacy_results(test text primary key,passed boolean not null);
do $test$
declare uid uuid:=gen_random_uuid();stranger uuid:=gen_random_uuid();ref text;email text;payload jsonb;result jsonb;denied boolean;
begin
 select project_ref into ref from public.website_project_briefs order by project_ref limit 1;
 email:='legacy-ledger-'||uid||'@example.invalid';
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 (uid,email,now(),'{"full_name":"Synthetic ledger regression"}'),
 (stranger,'legacy-ledger-'||stranger||'@example.invalid',null,'{"full_name":"Synthetic unverified regression"}');
 payload:=jsonb_build_object('version',1,'outbound','suppressed','manifest',jsonb_build_object('fixture',true),
 'people',jsonb_build_array(jsonb_build_object('personKey','test-member','email',email,'held',false),jsonb_build_object('personKey','test-hold','email','invalid-source','held',true)),
 'groups',jsonb_build_array(jsonb_build_object('teamRef','TEST-LEGACY-TEAM','projectCode',ref,'arrangement','Team')),
 'allocations',jsonb_build_array(jsonb_build_object('sourceRow',2,'teamRef','TEST-LEGACY-TEAM','projectCode',ref,'personKey','test-member','recordedAssignmentStatus','Awaiting acknowledgement','contactHold',false,'activeWorkspaceAccessAfterVerifiedClaim',false)),
 'history',jsonb_build_array(jsonb_build_object('sourceRow',3,'recordedAssignmentStatus','Withdrawn','activeAccess',false)));
 result:=private_legacy_roster.import_batch('synthetic-legacy-ledger-regression',payload);
 assert result=jsonb_build_object('repeated',false,'people',2,'groups',1,'allocations',1,'history',1);
 result:=private_legacy_roster.import_batch('synthetic-legacy-ledger-regression',payload);assert result->>'repeated'='true';
 insert into legacy_results values('source counts and idempotent import',true);
 denied:=false;begin perform private_legacy_roster.import_batch('synthetic-legacy-ledger-regression',payload||'{"version":2}');exception when raise_exception then denied:=true;end;assert denied;
 denied:=false;begin perform private_legacy_roster.import_batch('synthetic-invalid-ledger-fixture',jsonb_set(payload,'{allocations,0,personKey}','"missing"'));exception when foreign_key_violation then denied:=true;end;assert denied;
 assert not exists(select 1 from private_legacy_roster.batches where batch_key='synthetic-invalid-ledger-fixture');
 insert into legacy_results values('changed source and orphan allocation rejected atomically',true);
 perform set_config('request.jwt.claim.sub',uid::text,true);
 denied:=false;begin perform private_legacy_roster.claim_current_account('synthetic-legacy-ledger-regression');exception when raise_exception then denied:=true;end;assert denied;
 update private_legacy_roster.batches set state='approved' where batch_key='synthetic-legacy-ledger-regression';
 result:=private_legacy_roster.claim_current_account('synthetic-legacy-ledger-regression');assert result=jsonb_build_object('matched',true,'allocations',1);
 perform private_legacy_roster.claim_current_account('synthetic-legacy-ledger-regression');
 assert (select count(*)=1 from private_legacy_roster.claims where batch_key='synthetic-legacy-ledger-regression');
 assert not exists(select 1 from public.website_project_team_members where user_id=uid);
 insert into legacy_results values('approved verified claim retry grants no pending workspace access',true);
 perform set_config('request.jwt.claim.sub',stranger::text,true);
 denied:=false;begin perform private_legacy_roster.claim_current_account('synthetic-legacy-ledger-regression');exception when insufficient_privilege then denied:=true;end;assert denied;
 update auth.users set email_confirmed_at=now() where id=stranger;
 result:=private_legacy_roster.claim_current_account('synthetic-legacy-ledger-regression');assert result->>'matched'='false';
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;begin perform private_legacy_roster.claim_current_account('synthetic-legacy-ledger-regression');exception when insufficient_privilege then denied:=true;end;assert denied;
 insert into legacy_results values('unverified unrelated and signed-out identities cannot claim',true);
 assert not has_table_privilege('authenticated','private_legacy_roster.people','select');
 assert not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private_legacy_roster' and (has_function_privilege('anon',p.oid,'execute') or (p.proname<>'claim_my_labs' and has_function_privilege('authenticated',p.oid,'execute')) or has_function_privilege('service_role',p.oid,'execute')));
 insert into legacy_results values('private functions denied to all API roles',true);
 perform private_legacy_roster.remove_rehearsal('synthetic-legacy-ledger-regression');
 assert not exists(select 1 from private_legacy_roster.allocations where batch_key='synthetic-legacy-ledger-regression');
 assert not exists(select 1 from private_legacy_roster.claims where batch_key='synthetic-legacy-ledger-regression');
 result:=private_legacy_roster.import_batch('synthetic-legacy-ledger-regression',payload);assert result->>'allocations'='1';
 perform private_legacy_roster.remove_rehearsal('synthetic-legacy-ledger-regression');
 insert into legacy_results values('batch removal and reapply reproduce counts',true);
end $test$;
select * from legacy_results order by test;
rollback;
