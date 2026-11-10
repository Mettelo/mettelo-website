begin;
create temp table project_mail_test_results(check_name text,passed boolean);
do $$
declare source public.website_project_interests; ref text; chosen_role text; iid uuid; tid uuid; n integer; drafts jsonb;
begin
 select i.* into source from public.website_project_interests i join auth.users u on u.id=i.user_id where u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) limit 1;
 if source.id is null then raise exception 'A verified staging fixture is required';end if;
 select b.project_ref,b.roles->>0 into ref,chosen_role from public.website_project_briefs b where not exists(select 1 from public.website_project_interests i where i.user_id=source.user_id and i.project_ref=b.project_ref) and jsonb_array_length(b.roles)>0 order by b.project_ref limit 1;
 if ref is null then raise exception 'An unused staging project is required';end if;
 insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version)
 values(source.user_id,ref,'solo',null,source.motivation,source.contribution,source.answers,source.terms_version) returning id into iid;
 select count(*) into n from private_website_lab.project_email_previews where interest_id=iid and kind='application_received';
 if n<>1 then raise exception 'Receipt event missing';end if;
 insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version)
 values(source.user_id,ref,'solo',null,source.motivation,source.contribution,source.answers,source.terms_version) on conflict do nothing;
 if (select count(*) from private_website_lab.project_email_previews where interest_id=iid and kind='application_received')<>1 then raise exception 'Duplicate receipt';end if;
 insert into project_mail_test_results values('receipt and duplicate submission',true);
 insert into private_website_lab.interest_reviews(interest_id,status,note,reviewer_id) values(iid,'clarification','PRIVATE_REVIEW_SECRET',source.user_id);
 update private_website_lab.interest_reviews set note='OTHER_PRIVATE_SECRET',updated_at=now() where interest_id=iid;
 if (select count(*) from private_website_lab.project_email_previews where interest_id=iid and kind='clarification')<>1 then raise exception 'Repeated decision draft';end if;
 drafts:=public.website_project_email_previews(200);
 if drafts::text like '%PRIVATE%SECRET%' or not exists(select 1 from jsonb_array_elements(drafts) x where x->>'kind'='clarification' and x->>'recipient_id'=source.user_id::text and x->>'project_ref'=ref) then raise exception 'Clarification projection failed';end if;
 update private_website_lab.interest_reviews set status='declined',updated_at=now() where interest_id=iid;
 drafts:=public.website_project_email_previews(200);
 if exists(select 1 from jsonb_array_elements(drafts) x where x->>'kind'='clarification' and x->>'project_ref'=ref and x->>'recipient_id'=source.user_id::text) then raise exception 'Stale clarification included';end if;
 insert into project_mail_test_results values('private notes excluded and superseded decisions filtered',true);
 insert into public.website_project_teams(project_ref,label,participation,minimum_members,required_roles) values(ref,'Email preview fixture — rollback','solo',1,'{}') returning id into tid;
 insert into public.website_project_team_members(team_id,interest_id,user_id,role,status,project_ref,offer_expires_at)
 values(tid,iid,source.user_id,chosen_role,'offered',ref,now()+interval '7 days');
 update public.website_project_team_members set status='offered' where team_id=tid;
 if (select count(*) from private_website_lab.project_email_previews where team_id=tid and kind='offer_ready')<>1 then raise exception 'Offer duplicate';end if;
 if not exists(select 1 from jsonb_array_elements(public.website_project_email_previews(200)) x where x->>'team_id'=tid::text and x->>'kind'='offer_ready') then raise exception 'Offer preview missing';end if;
 update public.website_project_team_members set status='confirmed',acknowledged_at=now(),access_verified_at=now(),commitment_confirmed_at=now(),admitted_at=now(),onboarding_checked_at=now() where team_id=tid;
 if exists(select 1 from private_website_lab.project_email_previews where team_id=tid and kind='lab_ready') then raise exception 'Lab ready before activation';end if;
 insert into private_website_lab.items(team_id,kind,title,owner_id,author_id) values(tid,'milestone','Fixture milestone',source.user_id,source.user_id);
 update public.website_project_teams set status='active',lab_enabled=true,coordinator_id=source.user_id where id=tid;
 if (select count(*) from private_website_lab.project_email_previews where team_id=tid and kind='lab_ready')<>1 then raise exception 'Lab-ready event missing';end if;
 update public.website_project_teams set label=label where id=tid;
 if (select count(*) from private_website_lab.project_email_previews where team_id=tid and kind='lab_ready')<>1 then raise exception 'Lab-ready duplicate';end if;
 drafts:=public.website_project_email_previews(200);
 if exists(select 1 from jsonb_array_elements(drafts) x where x->>'team_id'=tid::text and x->>'kind'='offer_ready') then raise exception 'Accepted offer remains actionable';end if;
 if not exists(select 1 from jsonb_array_elements(drafts) x where x->>'team_id'=tid::text and x->>'kind'='lab_ready') then raise exception 'Lab-ready projection missing';end if;
 insert into project_mail_test_results values('offer acceptance and Lab activation are separate and deduplicated',true);
 update public.website_project_teams set status='paused' where id=tid;
 if exists(select 1 from jsonb_array_elements(public.website_project_email_previews(200)) x where x->>'team_id'=tid::text and x->>'kind'='lab_ready') then raise exception 'Paused Lab included';end if;
 insert into project_mail_test_results values('paused workspace suppresses Lab-ready preview',true);
 if has_function_privilege('anon','public.website_project_email_previews(integer)','EXECUTE') or has_function_privilege('authenticated','public.website_project_email_previews(integer)','EXECUTE') then raise exception 'Public preview access';end if;
 insert into project_mail_test_results values('service-only preview permissions',true);
end $$;
select * from project_mail_test_results;
rollback;
