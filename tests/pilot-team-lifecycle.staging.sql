-- STAGING ONLY. Requires no recorded activity on MTL-DA-001.
-- Synthetic fixtures and changes are rolled back; do not run against production.
begin;
do $test$
declare users uuid[]:=array[]::uuid[]; interests uuid[]:=array[]::uuid[]; uid uuid; iid uuid; team_a uuid; team_b uuid; activity jsonb; state text; i integer; rejected boolean:=false; was_open boolean;
begin
 select intake_open into was_open from public.website_project_briefs where project_ref='MTL-DA-001';
 update public.website_project_pilot_settings set max_active_teams=1 where project_ref='MTL-DA-001';
 for i in 1..3 loop
  uid:=gen_random_uuid();
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'pilot-fixture-'||uid||'@example.invalid',now(),'{"full_name":"Synthetic Pilot Test"}');
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(uid,'MTL-DA-001','team','Data Analyst',repeat('test ',8),repeat('test ',12),'{}','2026-09-03-v1') returning id into iid;
  users:=array_append(users,uid);interests:=array_append(interests,iid);
 end loop;
 insert into public.website_project_teams(project_ref,label,minimum_members,required_roles) values('MTL-DA-001','Rollback test team A',3,array['Data Analyst']) returning id into team_a;
 insert into public.website_project_teams(project_ref,label,minimum_members,required_roles) values('MTL-DA-001','Rollback test team B',2,array['Data Analyst']) returning id into team_b;
 for i in 1..2 loop insert into public.website_project_team_members(team_id,interest_id,user_id,role) values(team_a,interests[i],users[i],'Data Analyst');end loop;
 select status into state from public.website_project_teams where id=team_a;if state<>'forming' then raise exception 'Two members must remain forming';end if;
 insert into public.website_project_team_members(team_id,interest_id,user_id,role) values(team_a,interests[3],users[3],'Data Analyst');
 select status into state from public.website_project_teams where id=team_a;if state<>'active' then raise exception 'Third qualifying member must start team';end if;
 for i in 1..2 loop insert into public.website_project_team_members(team_id,interest_id,user_id,role) values(team_b,interests[i],users[i],'Data Analyst');end loop;
 select status into state from public.website_project_teams where id=team_b;if state<>'forming' then raise exception 'Capacity must prevent extra active team';end if;
 update public.website_project_pilot_settings set max_active_teams=2 where project_ref='MTL-DA-001';perform public.website_reconcile_pilot_teams('MTL-DA-001');
 select x into activity from jsonb_array_elements(public.website_public_pilot_activity()) x where x->>'project_ref'='MTL-DA-001';
 if (activity->>'active_teams')::int<>2 or (activity->>'active_contributors')::int<>3 then raise exception 'Counts must show 2 teams and 3 distinct contributors';end if;
 if (select intake_open from public.website_project_briefs where project_ref='MTL-DA-001') is distinct from was_open then raise exception 'Team start changed project intake';end if;
 begin insert into public.website_project_team_members(team_id,interest_id,user_id,role) values(team_b,interests[3],users[3],'Invalid project role');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Invalid role was allowed';end if;
 if has_table_privilege('authenticated','public.website_project_team_members','INSERT') then raise exception 'Member must not self-assign';end if;
end $test$;
select 'passed: threshold, capacity, repeatable teams, distinct counts, continuous intake, role and write protection' as lifecycle_test;
rollback;
