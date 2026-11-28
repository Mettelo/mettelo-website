begin;
create temp table approval_results(check_name text,passed boolean);
create function pg_temp.fail_approval_fixture() returns trigger language plpgsql as $$begin
 if current_setting('test.approval_fail',true)='on' then raise exception 'Synthetic provisioning failure';end if;return new;
end $$;
create trigger zz_approval_fixture_failure before insert on public.website_project_teams for each row execute function pg_temp.fail_approval_fixture();
do $test$
#variable_conflict use_variable
declare staff uuid;uid uuid;other uuid;refs text[];apps uuid[]:='{}';people uuid[]:='{}';iid uuid;tid uuid;solo_tid uuid;result jsonb;again jsonb;denied boolean;before_count integer;before_notice integer;old_reviews text;k integer;team_tid uuid;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select array_agg(project_ref order by project_ref) into refs from(select project_ref from public.website_project_briefs order by project_ref limit 5)x;
 select md5(coalesce(jsonb_agg(to_jsonb(r)-'placement_route'-'placement_state'-'placement_team_id'-'placement_role'-'placement_error'-'approved_at' order by interest_id)::text,'')) into old_reviews from private_website_lab.interest_reviews r;
 for k in 1..10 loop
  uid:=gen_random_uuid();people:=array_append(people,uid);
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'approval-rollback-'||uid||'@example.invalid',now(),'{"full_name":"Synthetic approval member"}');
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version)
   select uid,refs[1],case when k in(2,3,4) then 'team' when k=5 then 'flexible' else 'solo' end,roles->>0,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes","coordination_preference":"comfortable"}','2026-09-03-v1' from public.website_project_briefs where project_ref=refs[1] returning id into iid;
  apps:=array_append(apps,iid);
 end loop;
 perform set_config('request.jwt.claim.sub',people[1]::text,true);
 denied:=false;begin perform public.website_project_approval('approve',jsonb_build_object('interest_id',apps[1]));exception when insufficient_privilege then denied:=true;end;
 assert denied,'Ordinary member approved application';
 other:=gen_random_uuid();
 insert into auth.users(id,email,raw_user_meta_data) values(other,'approval-unverified-'||other||'@example.invalid','{}');
 insert into private_website_lab.member_roles(user_id,role) values(other,'full_admin');
 perform set_config('request.jwt.claim.sub',other::text,true);
 denied:=false;begin perform public.website_project_approval('approve',jsonb_build_object('interest_id',apps[1]));exception when insufficient_privilege then denied:=true;end;
 assert denied,'Unverified staff approved an application';
 perform set_config('request.jwt.claim.sub',staff::text,true);
 result:=public.website_project_approval('approve',jsonb_build_object('interest_id',apps[1]));
 assert result->>'placement_state'='placed', 'Solo placement failed: '||result::text;
 solo_tid:=(result->>'team_id')::uuid;
 assert exists(select 1 from public.website_project_team_members where team_id=solo_tid and user_id=people[1] and status='confirmed' and acknowledged_at is not null and offer_expires_at is null and admitted_at is null and commitment_confirmed_at is null and access_verified_at is null),'Solo bypassed readiness or still needs an offer';
 assert (select count(*) from private_website_lab.journey_mail where recipient_id=people[1] and kind='application_approved')=1,'Approval email event missing or duplicated';
 select count(*) into before_count from public.website_project_teams;select count(*) into before_notice from private_website_lab.notifications;
 again:=public.website_project_approval('approve',jsonb_build_object('interest_id',apps[1]));
 perform public.website_project_approval('retry',jsonb_build_object('interest_id',apps[1]));
 assert again->>'team_id'=solo_tid::text and (select count(*) from public.website_project_teams)=before_count and (select count(*) from private_website_lab.notifications)=before_notice,'Duplicate approval created records or notices';
 insert into approval_results values('Solo direct confirmation and duplicate/timeout retries create one Lab, membership and approval notice',true);
 perform set_config('request.jwt.claim.sub',people[1]::text,true);
 result:=public.website_lab('mine');assert exists(select 1 from jsonb_array_elements(result)x where x->>'team_id'=solo_tid::text and x->>'can_enter'='false'),'Unready Solo Lab accessible';
 denied:=false;begin perform public.website_lab('workspace',jsonb_build_object('team_id',solo_tid));exception when insufficient_privilege then denied:=true;end;assert denied,'Unready workspace bypassed';
 perform public.website_lab('confirm_commitment',jsonb_build_object('team_id',solo_tid));
 perform set_config('request.jwt.claim.sub',staff::text,true);
 perform public.website_lab('verify_access',jsonb_build_object('team_id',solo_tid,'user_id',people[1],'reason','Synthetic rollback repository verification'));
 assert exists(select 1 from public.website_project_teams where id=solo_tid and status='active'),'Ready Solo did not activate';
 assert exists(select 1 from public.website_project_team_members where team_id=solo_tid and admitted_at is not null),'Ready Solo not admitted';
 insert into approval_results values('Existing commitment, repository verification and readiness open the approved Solo Lab without a second decision',true);
 for k in 2..4 loop
  result:=public.website_project_approval('approve',jsonb_build_object('interest_id',apps[k]));
  assert result->>'placement_state'='waiting_team','Team applicant missing waiting outcome';
 end loop;
 result:=public.website_project_admin_directory('list',jsonb_build_object('section','applications','review','approved','q','Synthetic approval member'));
 assert (result->>'total')::integer>=4,'Approved applications disappeared';
 result:=public.website_project_admin_directory('candidates',jsonb_build_object('project',refs[1],'arrangement','team'));
 assert exists(select 1 from jsonb_array_elements(result->'rows')x where x->>'id'=apps[2]::text),'Approved waiting applicant not in formation pool';
 team_tid:=(public.website_lab('form_group',jsonb_build_object('project_ref',refs[1],'label','[ROLLBACK APPROVAL] Team '||gen_random_uuid(),'participation','team','compatibility_reviewed','true','nominee_id',people[2],'members',(select jsonb_agg(jsonb_build_object('interest_id',apps[g.n],'role',b.roles->>0)) from generate_series(2,4) g(n) cross join public.website_project_briefs b where b.project_ref=refs[1])))->>'team_id')::uuid;
 assert (select count(*) from public.website_project_team_members where team_id=team_tid and status='confirmed')=3,'Approved team members received a second offer';
 assert (select count(*) from private_website_lab.interest_reviews where interest_id=any(apps[2:4]) and placement_state='placed' and placement_team_id=team_tid)=3,'Team formation did not update outcomes';
 insert into approval_results values('Team approvals remain searchable and form through existing group/role/coordinator mechanism without reapproval',true);
 -- An administrator can also place an approved applicant directly into a suitable existing group.
 update public.website_project_interests set participation='team' where id=apps[9];
 result:=public.website_project_approval('approve',jsonb_build_object('interest_id',apps[9],'team_id',team_tid));
 assert result->>'team_id'=team_tid::text and exists(select 1 from public.website_project_team_members where team_id=team_tid and user_id=people[9] and status='confirmed'),'Selected forming-team placement failed';
 insert into approval_results values('Selected existing forming teams reuse current capacity, responsibilities and confirmed-membership checks',true);
 perform public.website_lab('review_interest',jsonb_build_object('interest_id',apps[10],'review_status','clarification','reason','Private clarification context'));
 assert exists(select 1 from private_website_lab.project_email_previews where interest_id=apps[10] and kind='clarification'),'Clarification email missing';
 perform public.website_lab('review_interest',jsonb_build_object('interest_id',apps[10],'review_status','declined','reason','Private rejection context'));
 assert exists(select 1 from private_website_lab.project_email_previews where interest_id=apps[10] and kind='decision'),'Rejection email missing';
 insert into approval_results values('Approval, clarification and rejection reuse notification/email events without exposing administrator notes',true);
 denied:=false;begin perform public.website_project_approval('approve',jsonb_build_object('interest_id',apps[5]));exception when raise_exception then denied:=true;end;assert denied,'Flexible approval did not require one intended route';
 result:=public.website_project_approval('approve',jsonb_build_object('interest_id',apps[5],'participation','solo'));
 assert result->>'placement_state'='placed' and (select participation from public.website_project_interests where id=apps[5])='flexible','Flexible preference lost';
 assert (select count(*) from public.website_project_team_members where interest_id=apps[5])=1,'Flexible duplicated placements';
 insert into approval_results values('Flexible approval records exactly one route while preserving submitted Flexible preference',true);
 perform set_config('test.approval_fail','on',true);
 result:=public.website_project_approval('approve',jsonb_build_object('interest_id',apps[6],'reason','PRIVATE INTERNAL APPROVAL NOTE'));
 assert result->>'placement_state'='blocked' and (select status from private_website_lab.interest_reviews where interest_id=apps[6])='approved','Failed provisioning lost approval';
 assert not exists(select 1 from public.website_project_team_members where interest_id=apps[6]),'Failed provisioning left a membership';
 perform set_config('test.approval_fail','off',true);
 result:=public.website_project_approval('retry',jsonb_build_object('interest_id',apps[6]));assert result->>'placement_state'='placed','Retry did not recover';
 assert (select count(*) from private_website_lab.notifications where event_key='approval:'||apps[6])=1,'Retry duplicated approval notice';
 perform set_config('request.jwt.claim.sub',people[6]::text,true);result:=public.website_application_statuses();assert result::text not like '%PRIVATE%' and result::text not like '%placement_error%','Member projection leaked internal data';
 insert into approval_results values('Provisioning savepoint preserves approval, rolls back partial writes and safely retries with no private-note leak',true);
 perform set_config('request.jwt.claim.sub',staff::text,true);
 -- Three accepted/paused places occupy one shared entitlement; fourth approval persists blocked.
 for k in 1..4 loop
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version)
   select people[7],refs[k], 'solo',roles->>0,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes"}','2026-09-03-v1' from public.website_project_briefs where project_ref=refs[k]
   on conflict(user_id,project_ref) do update set participation='solo' returning id into iid;
  result:=public.website_project_approval('approve',jsonb_build_object('interest_id',iid));
  if k<4 then assert result->>'placement_state'='placed','Allowed slot failed';else assert result->>'placement_state'='blocked','Fourth Lab bypassed participation limit';end if;
 end loop;
 assert private_website_lab.participation_usage(people[7])->>'used'='3','Three-slot usage incorrect';
 insert into approval_results values('Three-Lab authoritative participation guard blocks fourth placement while retaining approval',true);
 -- Existing shortlist and offer retain legacy behaviour and no new approval is inferred.
 update public.website_project_interests set participation='flexible' where id=apps[8];
 perform public.website_lab('review_interest',jsonb_build_object('interest_id',apps[8],'review_status','shortlisted'));
 tid:=(public.website_lab('form_group',jsonb_build_object('project_ref',refs[1],'label','[ROLLBACK APPROVAL] Legacy '||gen_random_uuid(),'participation','solo','compatibility_reviewed','true','members',jsonb_build_array(jsonb_build_object('interest_id',apps[8],'role',(select roles->>0 from public.website_project_briefs where project_ref=refs[1])))))->>'team_id')::uuid;
 assert exists(select 1 from public.website_project_team_members where team_id=tid and status='offered'),'Legacy offer changed';
 result:=public.website_project_approval('approve',jsonb_build_object('interest_id',apps[8],'participation','team'));
 assert result->>'team_id'=tid::text and exists(select 1 from public.website_project_team_members where team_id=tid and status='offered'),'Historical offer overwritten by approval';
 assert (select placement_route from private_website_lab.interest_reviews where interest_id=apps[8])='solo','Historical actual route was replaced by a contradictory Flexible choice';
 assert old_reviews=(select md5(coalesce(jsonb_agg(to_jsonb(r)-'placement_route'-'placement_state'-'placement_team_id'-'placement_role'-'placement_error'-'approved_at' order by interest_id)::text,'')) from private_website_lab.interest_reviews r where not interest_id=any(apps) and not exists(select 1 from public.website_project_interests i where i.id=r.interest_id and i.user_id=people[7])),'Historical reviews changed';
 insert into approval_results values('Historical shortlist, offers and active memberships remain intact and linked rather than recreated',true);
end $test$;
select * from approval_results;
rollback;
