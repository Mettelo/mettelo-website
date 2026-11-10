-- Retained synthetic applicants for the local staging preview. Never run on production.
begin;
do $seed$
declare actor uuid; uid uuid; iid uuid; k integer; names text[]:=array['Demo · Amina (coordinator volunteer)','Demo · Ben (BI developer)','Demo · Chidi (analyst)','Demo · Dana (Solo)','Demo · Ellis (Flexible)'];
begin
 if exists(select 1 from auth.users where email like 'formation-preview-%@example.invalid') then return;end if;
 select a.user_id into actor from private_website_lab.admins a join auth.users u on u.id=a.user_id where lower(u.email)='taiwo.olaoluwaj@gmail.com';
 if actor is null then raise exception 'Staging project administrator not configured';end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 for k in 1..5 loop
  uid:=gen_random_uuid();insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'formation-preview-'||uid||'@example.invalid',now(),jsonb_build_object('full_name',names[k],'formation_preview_v2',true));
  update public.profiles set headline='Synthetic preview only · Not a community member' where id=uid;
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version)
   values(uid,'MTL-DA-001',case when k=4 then 'solo' when k=5 then 'flexible' else 'team' end,case when k=2 then 'BI Developer' else 'Data Analyst' end,
   'Synthetic preview application for testing project review and formation. This is not a real community member.',
   'Demo contribution: prepare a documented analysis or dashboard, review quality checks and collaborate on a clear delivery plan.',
   jsonb_build_object('interest_form_version',2,'team_formation_preference','either','flexible_preference',case when k=5 then 'prefer_team' else null end,
   'commitment_response','yes','availability','4 hours per week','time_zone','Europe/London','earliest_start',(current_date+1)::text,'collaboration_availability','Tuesday and Thursday, 19:00–20:00 Europe/London',
   'coordination_preference',case when k=1 then 'comfortable' else 'contributor' end,'leadership_interest',k=1,
   'coordination_example',case when k=1 then 'Demo evidence: organised a small peer project, kept a shared task list and followed up on blockers.' else null end,
   'coordination_approach',case when k=1 then 'Demo approach: agree weekly priorities, check progress and redistribute work when someone is unavailable.' else null end,
   'role_fit_statement','Synthetic example: own a documented analytical deliverable and review it with peers.','relevant_skills',jsonb_build_array('SQL','Power BI'),'contribution_areas',jsonb_build_array('Analysis & insight','Documentation')),
   '2026-09-03-v1') returning id into iid;
  perform public.website_lab('review_interest',jsonb_build_object('interest_id',iid,'review_status','shortlisted','reason','Synthetic demonstration only; reviewed for the staging formation preview.'));
 end loop;
end $seed$;
commit;
