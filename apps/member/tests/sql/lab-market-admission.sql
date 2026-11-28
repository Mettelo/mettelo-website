-- Official workflow, lifecycle and privilege assertions. Every fixture rolls back.
begin;
create temp table participation_results(check_name text,passed boolean);
create function pg_temp.fixture_offer(staff uuid,uid uuid,ref text) returns uuid language plpgsql as $$
declare iid uuid;role_name text;tid uuid;
begin
 select roles->>0 into role_name from public.website_project_briefs where project_ref=ref;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 select id into iid from public.website_project_interests where user_id=uid and project_ref=ref;
 if iid is null then
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(uid,ref,'solo',role_name,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes"}','2026-09-03-v1') returning id into iid;
 end if;
 perform public.website_lab('review_interest',jsonb_build_object('interest_id',iid,'review_status','shortlisted'));
 tid:=(public.website_lab('form_group',jsonb_build_object('project_ref',ref,'label','[ROLLBACK PARTICIPATION] '||gen_random_uuid(),'participation','solo','compatibility_reviewed','true','required_roles',jsonb_build_array(role_name),'members',jsonb_build_array(jsonb_build_object('interest_id',iid,'role',role_name))))->>'team_id')::uuid;
 return tid;
end $$;
create temp table market_results(check_name text,passed boolean);
do $test$
#variable_conflict use_variable
declare staff uuid;ids uuid[]:='{}';uid uuid;refs text[];roles text[];tid uuid;team_tid uuid;iid uuid;apps uuid[]:='{}';inv uuid;req uuid;result jsonb;payload jsonb;denied boolean;k integer;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select array_agg(project_ref order by project_ref) into refs from(select project_ref from public.website_project_briefs order by project_ref limit 5)x;
 for k in 1..7 loop
  uid:=gen_random_uuid();ids:=array_append(ids,uid);
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'market-'||uid||'@example.invalid',now(),jsonb_build_object('full_name','Synthetic Market member '||uid));
 end loop;
 tid:=pg_temp.fixture_offer(staff,ids[1],refs[1]);
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));
 perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',ids[1],'reason','Synthetic Market Solo owner access check'));
 select array(select jsonb_array_elements_text(b.roles)) into roles from public.website_project_briefs b where b.project_ref=refs[1];
 perform public.website_lab_market('capacity',jsonb_build_object('team_id',tid,'capacity',2));
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 perform public.website_lab_market('recruitment',jsonb_build_object('team_id',tid,'open',true,'description','Synthetic public collaboration opportunity; no private Lab content.','commitment','Two hours per week','roles',jsonb_build_array(roles[1]),'skills',jsonb_build_array('SQL')));
 result:=public.website_lab_market('projects');if not exists(select 1 from jsonb_array_elements(result->'rows')x where x->>'team_id'=tid::text and x->>'title' is not null) then raise exception 'Recruiting project directory hid the active Lab';end if;
 result:=public.website_lab_market('my_labs');if not exists(select 1 from jsonb_array_elements(result)x where x->>'team_id'=tid::text and jsonb_array_length(x->'roles')>0) then raise exception 'Leader Lab list omitted advertised roles';end if;
 result:=public.website_lab_market('people',jsonb_build_object('q',ids[2]::text));if result->>'total'<>'0' then raise exception 'Private member leaked';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);perform public.website_lab_market('preferences','{"discoverable":true,"contactable":true}');
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 result:=public.website_lab_market('people',jsonb_build_object('q',ids[2]::text));if result->>'total'<>'1' or result->'rows'->0?'email' then raise exception 'Discovery projection incorrect';end if;
 inv:=(public.website_lab_market('invite',jsonb_build_object('team_id',tid,'member_id',ids[2],'role',roles[1],'proposal','Would you like to help with this public collaboration role?','commitment','Two hours per week'))->>'request_id')::uuid;
 result:=public.website_lab_market('inbox');if not exists(select 1 from jsonb_array_elements(result->'rows')x where x->>'id'=inv::text and x->>'team_id'=tid::text and x->>'kind'='invitation') then raise exception 'Invitation inbox projection incorrect';end if;
 if exists(select 1 from public.website_project_team_members where user_id=ids[2]) or private_website_lab.participation_usage(ids[2])->>'used'<>'0' then raise exception 'Invitation granted access or reserved a slot';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 denied:=false;begin perform public.website_lab('workspace',jsonb_build_object('team_id',tid));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Pending invitation entered Lab';end if;
 perform public.website_lab_market('accept',jsonb_build_object('request_id',inv));
 perform public.website_lab_market('accept',jsonb_build_object('request_id',inv));
 if (select count(*) from public.website_project_team_members where team_id=tid and user_id=ids[2] and admission_route='market' and interest_id is null)<>1 then raise exception 'Acceptance did not create one distinct Market membership';end if;
 result:=public.website_lab('workspace',jsonb_build_object('team_id',tid));
 if jsonb_array_length(result->'members')<>2 or result->>'can_lead'='true' then raise exception 'Collaborator roster or role incorrect';end if;
 result:=public.website_lab('mine');if not exists(select 1 from jsonb_array_elements(result)x where x->>'team_id'=tid::text and x->>'can_enter'='true' and x->>'admission_route'='market') then raise exception 'Market Lab missing from member journey';end if;
 perform public.website_lab('discussion',jsonb_build_object('team_id',tid,'project_ref',refs[1],'body','Synthetic Market collaborator discussion.','client_nonce',gen_random_uuid()));
 perform public.website_lab('add_item',jsonb_build_object('team_id',tid,'kind','resource','title','Synthetic collaboration reference','url','https://www.ons.gov.uk/'));
 result:=public.website_lab('meetings',jsonb_build_object('team_id',tid));if result->>'can_schedule'<>'true' then raise exception 'Collaborator cannot use member meeting actions';end if;
 if private_website_lab.readiness(tid)->>'ready'<>'true' or (select participation from public.website_project_teams where id=tid)<>'solo' or (select count(*) from public.website_project_team_members where team_id=tid and admission_route='core')<>1 then raise exception 'Market admission rewrote original Solo formation';end if;
 denied:=false;begin perform public.website_lab_market('recruitment',jsonb_build_object('team_id',tid,'open',false));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Market collaborator gained leadership';end if;
 insert into market_results values('opt-in discovery, consent, idempotent invitation acceptance and scoped Lab access preserve Solo formation',true);
 -- A member with three core Labs may request, but approval must fail atomically.
 for k in 2..4 loop
  team_tid:=pg_temp.fixture_offer(staff,ids[4],refs[k]);perform set_config('request.jwt.claim.sub',ids[4]::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',team_tid,'response','accept','commitment_confirmed','true'));perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',team_tid,'user_id',ids[4],'reason','Synthetic three-Lab Market boundary'));
 end loop;
 perform set_config('request.jwt.claim.sub',ids[4]::text,true);
 req:=(public.website_lab_market('request',jsonb_build_object('team_id',tid,'role',roles[1],'proposal','Synthetic proposal from a member with three active Labs.','commitment','Two hours per week'))->>'request_id')::uuid;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 denied:=false;begin perform public.website_lab_market('accept',jsonb_build_object('request_id',req));exception when raise_exception then if sqlerrm not like 'Lab participation limit reached%' then raise;end if;denied:=true;end;
 if not denied or (select state from private_website_lab.market_requests where id=req)<>'pending' or exists(select 1 from public.website_project_team_members where market_request_id=req) then raise exception 'Market approval bypassed three slots or left partial acceptance';end if;
 insert into market_results values('three core Labs block a fourth Market admission without a partial accepted request',true);
 perform set_config('request.jwt.claim.sub',ids[4]::text,true);perform public.website_lab_market('withdraw',jsonb_build_object('request_id',req));perform public.website_lab_market('preferences','{"discoverable":true,"contactable":true}');
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);req:=(public.website_lab_market('invite',jsonb_build_object('team_id',tid,'member_id',ids[4],'role',roles[1],'proposal','Synthetic invitation to a member already at the allowance.','commitment','Two hours weekly'))->>'request_id')::uuid;
 perform set_config('request.jwt.claim.sub',ids[4]::text,true);denied:=false;begin perform public.website_lab_market('accept',jsonb_build_object('request_id',req));exception when raise_exception then if sqlerrm not like 'Lab participation limit reached%' then raise;end if;denied:=true;end;
 if not denied or (select state from private_website_lab.market_requests where id=req)<>'pending' then raise exception 'Invitation bypassed the three-Lab limit';end if;
 insert into market_results values('a pending invitation reserves nothing and recipient acceptance cannot bypass three slots',true);
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);
 inv:=(public.website_lab_market('request',jsonb_build_object('team_id',tid,'role',roles[1],'proposal','Synthetic request to work with the existing project.','commitment','Three hours per week'))->>'request_id')::uuid;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);perform public.website_lab_market('accept',jsonb_build_object('request_id',inv));
 if private_website_lab.market_occupied(tid)<>2 then raise exception 'Request approval missing collaborator seat';end if;
 perform set_config('request.jwt.claim.sub',ids[6]::text,true);
 denied:=false;begin perform public.website_lab_market('request',jsonb_build_object('team_id',tid,'role',roles[1],'proposal','Synthetic request over collaboration capacity.','commitment','Two hours per week'));exception when raise_exception then denied:=true;end;if not denied then raise exception 'Collaboration capacity bypassed';end if;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);perform public.website_lab_market('remove',jsonb_build_object('team_id',tid,'member_id',ids[2],'reason','Synthetic collaborator removal during rollback test'));
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 denied:=false;begin perform public.website_lab('workspace',jsonb_build_object('team_id',tid));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Removed collaborator kept Lab access';end if;
 if private_website_lab.participation_usage(ids[2])->>'used'<>'0' then raise exception 'Never-provisioned collaborator retained slot';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);inv:=(public.website_lab_market('request',jsonb_build_object('team_id',tid,'role',roles[1],'proposal','Synthetic new request after a completed collaboration exit.','commitment','Two hours weekly'))->>'request_id')::uuid;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);perform public.website_lab_market('accept',jsonb_build_object('request_id',inv));
 if (select count(*) from public.website_project_team_members where team_id=tid and user_id=ids[2])<>1 then raise exception 'Rejoin duplicated the canonical membership';end if;
 perform public.website_lab_market('remove',jsonb_build_object('team_id',tid,'member_id',ids[2],'reason','Synthetic removal after successful rejoin test'));
 insert into market_results values('fully exited collaborators can rejoin through a new consent record without duplicate membership',true);
 insert into market_results values('leader request approval respects separate collaboration seats and removal revokes workspace access',true);
 -- A normal Team coordinator can recruit, while ordinary core members cannot.
 select array(select jsonb_array_elements_text(b.roles)) into roles from public.website_project_briefs b where b.project_ref=refs[5];
 perform set_config('request.jwt.claim.sub',staff::text,true);
 for k in 5..7 loop
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(ids[k],refs[5],'team',roles[1],repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes","coordination_preference":"comfortable"}','2026-09-03-v1') returning id into iid;
  apps:=array_append(apps,iid);perform public.website_lab('review_interest',jsonb_build_object('interest_id',iid,'review_status','shortlisted'));
 end loop;
 team_tid:=(public.website_lab('form_group',jsonb_build_object('project_ref',refs[5],'label','[ROLLBACK MARKET] Core Team','participation','team','compatibility_reviewed','true','nominee_id',ids[5],'required_roles',jsonb_build_array(roles[1]),'members',jsonb_build_array(jsonb_build_object('interest_id',apps[1],'role',roles[1]),jsonb_build_object('interest_id',apps[2],'role',roles[1]),jsonb_build_object('interest_id',apps[3],'role',roles[1]))))->>'team_id')::uuid;
 for k in 5..7 loop perform set_config('request.jwt.claim.sub',ids[k]::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',team_tid,'response','accept','commitment_confirmed','true'));end loop;
 perform set_config('request.jwt.claim.sub',ids[5]::text,true);perform public.website_lab('agree_coordinator',jsonb_build_object('team_id',team_tid));
 perform set_config('request.jwt.claim.sub',staff::text,true);for k in 5..7 loop perform public.website_lab('verify_access',jsonb_build_object('team_id',team_tid,'user_id',ids[k],'reason','Synthetic Team readiness access check'));end loop;
 perform public.website_lab_market('capacity',jsonb_build_object('team_id',team_tid,'capacity',1));
 perform set_config('request.jwt.claim.sub',ids[5]::text,true);perform public.website_lab_market('recruitment',jsonb_build_object('team_id',team_tid,'open',true,'description','Synthetic Team collaboration opportunity.','commitment','Two hours weekly','roles',jsonb_build_array(roles[1])));
 perform set_config('request.jwt.claim.sub',ids[6]::text,true);
 denied:=false;begin perform public.website_lab_market('invite',jsonb_build_object('team_id',team_tid,'member_id',ids[2],'role',roles[1],'proposal','An ordinary member must not send this invitation.','commitment','Two hours per week'));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Ordinary core member invited on behalf of Lab';end if;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);inv:=(public.website_lab_market('request',jsonb_build_object('team_id',team_tid,'role',roles[1],'proposal','Synthetic request to join the active Team Lab.','commitment','Two hours per week'))->>'request_id')::uuid;
 perform set_config('request.jwt.claim.sub',ids[5]::text,true);perform public.website_lab_market('accept',jsonb_build_object('request_id',inv));
 -- Two core Labs plus one Market Lab share the same three-slot count.
 for k in 2..3 loop
  payload:=jsonb_build_object('team_id',pg_temp.fixture_offer(staff,ids[3],refs[k]));
  perform set_config('request.jwt.claim.sub',ids[3]::text,true);perform public.website_lab('respond',payload||'{"response":"accept","commitment_confirmed":"true"}'::jsonb);
  perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('verify_access',payload||jsonb_build_object('user_id',ids[3],'reason','Synthetic mixed-source participation verification'));
 end loop;
 if private_website_lab.participation_usage(ids[3])->>'used'<>'3' then raise exception 'Mixed participation not counted';end if;
 perform public.website_lab_market('capacity',jsonb_build_object('team_id',team_tid,'capacity',2));
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);inv:=(public.website_lab_market('request',jsonb_build_object('team_id',team_tid,'role',roles[1],'proposal','Synthetic fourth mixed-source Lab request.','commitment','Two hours weekly'))->>'request_id')::uuid;
 perform set_config('request.jwt.claim.sub',ids[5]::text,true);denied:=false;begin perform public.website_lab_market('accept',jsonb_build_object('request_id',inv));exception when raise_exception then if sqlerrm not like 'Lab participation limit reached%' then raise;end if;denied:=true;end;if not denied then raise exception 'Mixed core/Market limit bypassed';end if;
 insert into market_results values('core and Market collaborations share one three-slot allowance',true);
 perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',team_tid,'user_id',ids[2],'reason','Synthetic external access evidence before removal'));
 perform set_config('request.jwt.claim.sub',ids[5]::text,true);perform public.website_lab_market('remove',jsonb_build_object('team_id',team_tid,'member_id',ids[2],'reason','Synthetic removal requiring external access revocation'));
 if private_website_lab.participation_usage(ids[2])->>'revoking'<>'1' then raise exception 'Market removal freed slot before required revocation';end if;
 perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('external_access_review',jsonb_build_object('team_id',team_tid,'user_id',ids[2],'external_access_confirmed','true'));
 if private_website_lab.participation_usage(ids[2])->>'used'<>'0' then raise exception 'Market external revocation did not release slot';end if;
 insert into market_results values('Market departure retains its slot until required external access revocation completes',true);
 update public.website_project_teams set status='paused' where id=team_tid;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 denied:=false;begin perform public.website_lab_market('request',jsonb_build_object('team_id',team_tid,'role',roles[1],'proposal','Synthetic request into a paused project Lab.','commitment','Two hours per week'));exception when raise_exception then denied:=true;end;if not denied then raise exception 'Paused Lab accepted recruitment';end if;
 if private_website_lab.readiness(team_tid)->>'ready'<>'true' then raise exception 'Market collaborators changed official Team readiness';end if;
 insert into market_results values('Team coordinator recruitment preserves core minimums and ordinary-member/paused-Lab restrictions',true);
 if has_table_privilege('authenticated','private_website_lab.market_requests','INSERT') or has_function_privilege('anon','public.website_lab_market(text,jsonb)','EXECUTE') then raise exception 'Market private state or anonymous RPC exposed';end if;
 insert into market_results values('private Market tables and anonymous access remain denied',true);
end $test$;
select * from market_results;
rollback;
