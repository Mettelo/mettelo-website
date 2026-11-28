-- Every synthetic identity, offer, notification and workspace is rolled back.
begin;
create temp table responsibility_results(check_name text,passed boolean);
do $test$
#variable_conflict use_variable
declare staff uuid;ids uuid[]:='{}';apps uuid[]:='{}';uid uuid;iid uuid;ref text;catalogue text[];essential text[];solo_id uuid;tid uuid;payload jsonb;result jsonb;one jsonb;k integer;denied boolean;before_count bigint;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' and private_website_lab.permitted(user_id,'operations') limit 1;
 select project_ref,array(select jsonb_array_elements_text(roles)) into ref,catalogue from public.website_project_briefs where jsonb_typeof(roles)='array' and jsonb_array_length(roles)>=2 order by project_ref limit 1;
 essential:=catalogue[1:2];
 for k in 1..5 loop
  uid:=gen_random_uuid();insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'responsibility-'||uid||'@example.invalid',now(),'{"full_name":"Synthetic responsibilities member"}');
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(uid,ref,case when k=1 then 'solo' else 'team' end,catalogue[1],repeat('fixture ',5),repeat('fixture ',8),jsonb_build_object('commitment_response','yes','coordination_preference',case when k=2 then 'comfortable' else 'contributor' end),'2026-09-03-v1') returning id into iid;
  ids:=array_append(ids,uid);apps:=array_append(apps,iid);
 end loop;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 for k in 1..5 loop perform public.website_lab('review_interest',jsonb_build_object('interest_id',apps[k],'review_status','shortlisted'));end loop;
 solo_id:=(public.website_lab('form_group',jsonb_build_object('project_ref',ref,'label','[ROLLBACK] Multi-responsibility solo','participation','solo','compatibility_reviewed','true','required_roles',to_jsonb(essential),'members',jsonb_build_array(jsonb_build_object('interest_id',apps[1],'role',catalogue[1],'roles',jsonb_build_array(catalogue[1])))))->>'team_id')::uuid;
 if (select responsibilities from public.website_project_team_members where team_id=solo_id and user_id=ids[1]) is distinct from essential then raise exception 'Solo essential roles not assigned automatically';end if;
 if (select count(*) from public.website_project_team_members where team_id=solo_id)<>1 then raise exception 'Solo responsibilities duplicated the owner';end if;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 result:=public.website_lab('mine');select x into one from jsonb_array_elements(result) x where x->>'team_id'=solo_id::text;
 if one->'roles' is distinct from to_jsonb(essential) or strpos(one->>'role',catalogue[2])=0 then raise exception 'Offer hides additional responsibilities';end if;
 perform public.website_lab('respond',jsonb_build_object('team_id',solo_id,'response','accept','commitment_confirmed','true'));
 perform set_config('request.jwt.claim.sub',staff::text,true);
 perform public.website_lab('verify_access',jsonb_build_object('team_id',solo_id,'user_id',ids[1],'reason','Synthetic access verification only'));
 perform public.website_lab('prepare_workspace',jsonb_build_object('team_id',solo_id));
 if private_website_lab.readiness(solo_id)->>'ready'<>'true' then raise exception 'Solo multi-role readiness failed';end if;
 if (select status from public.website_project_teams where id=solo_id)<>'active' then raise exception 'Ready Solo Lab did not open automatically';end if;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);
 result:=public.website_lab('workspace',jsonb_build_object('team_id',solo_id));
 if not exists(select 1 from jsonb_array_elements(result->'members') x where x->>'id'=ids[1]::text and x->'roles'=to_jsonb(essential)) then raise exception 'Lab roster lost solo responsibilities';end if;
 insert into responsibility_results values('solo essential roles persist through offer, acceptance, readiness, start and Lab roster',true);
 perform set_config('request.jwt.claim.sub',staff::text,true);
 payload:=jsonb_build_object('project_ref',ref,'label','[ROLLBACK] Multi-responsibility team','participation','team','compatibility_reviewed','true','nominee_id',ids[2],'required_roles',to_jsonb(essential),'members',jsonb_build_array(jsonb_build_object('interest_id',apps[2],'role',catalogue[1],'roles',to_jsonb(essential)),jsonb_build_object('interest_id',apps[3],'role',catalogue[1]),jsonb_build_object('interest_id',apps[4],'role',catalogue[1])));
 denied:=false;begin perform public.website_lab('form_group',payload||jsonb_build_object('members',jsonb_build_array(payload->'members'->0,payload->'members'->1)));exception when raise_exception then denied:=true;end;if not denied then raise exception 'Roles counted as extra people';end if;
 denied:=false;begin perform public.website_lab('form_group',payload||jsonb_build_object('members',jsonb_build_array(jsonb_build_object('interest_id',apps[2],'role',catalogue[1]),payload->'members'->1,payload->'members'->2)));exception when raise_exception then denied:=true;end;if not denied then raise exception 'Missing essential responsibility accepted';end if;
 denied:=false;begin perform public.website_lab('form_group',payload||jsonb_build_object('members',jsonb_build_array(jsonb_build_object('interest_id',apps[2],'role',catalogue[1],'roles',jsonb_build_array(catalogue[1],'Outside project role')),payload->'members'->1,payload->'members'->2)));exception when raise_exception then denied:=true;end;if not denied then raise exception 'Foreign role accepted';end if;
 tid:=(public.website_lab('form_group',payload)->>'team_id')::uuid;
 for k in 2..4 loop perform set_config('request.jwt.claim.sub',ids[k]::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));end loop;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);perform public.website_lab('agree_coordinator',jsonb_build_object('team_id',tid));
 perform set_config('request.jwt.claim.sub',staff::text,true);
 for k in 2..4 loop perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',ids[k],'reason','Synthetic access verification only'));end loop;
 perform public.website_lab('prepare_workspace',jsonb_build_object('team_id',tid));
 if private_website_lab.readiness(tid)->>'ready'<>'true' then raise exception 'Multi-role team not ready';end if;
 if (select status from public.website_project_teams where id=tid)<>'active' then raise exception 'Ready Team Lab did not open automatically';end if;
 if (select count(*) from public.website_project_team_members m where m.team_id=tid and m.status='confirmed')<>3 then raise exception 'Responsibilities changed actual headcount';end if;
 insert into responsibility_results values('one member covers multiple essential roles while team headcount and coordinator checks remain',true);
 -- A replacement/additional offer has the same multi-role support and remains pending consent.
 perform public.website_lab('offer',jsonb_build_object('team_id',tid,'interest_id',apps[5],'responsibilities',to_jsonb(essential)));
 if (select responsibilities from public.website_project_team_members m where m.team_id=tid and user_id=ids[5]) is distinct from essential then raise exception 'Additional offer lost responsibilities';end if;
 if (select status from public.website_project_team_members m where m.team_id=tid and user_id=ids[5])<>'offered' then raise exception 'New responsibilities bypassed acceptance';end if;
 insert into responsibility_results values('additional offers retain multiple responsibilities and require member acceptance',true);
 denied:=false;begin update public.website_project_team_members m set responsibilities=array[catalogue[1]] where m.team_id=tid and user_id=ids[2];exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Accepted responsibilities silently changed';end if;
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);
 denied:=false;begin perform public.website_lab('offer',jsonb_build_object('team_id',tid,'interest_id',apps[5],'responsibilities',to_jsonb(essential)));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Member gained offer authority';end if;
 insert into responsibility_results values('accepted role sets are immutable and ordinary members gain no allocation authority',true);
 result:=public.website_public_pilot_activity();
 if not exists(select 1 from jsonb_array_elements(result) p cross join lateral jsonb_array_elements(p->'teams') t where t->>'id'=tid::text and (t->'filled_roles') ? catalogue[2] and (t->>'members')::integer=3) then raise exception 'Public coverage/headcount aggregate is incorrect';end if;
 insert into responsibility_results values('public activity reports all covered roles and distinct people',true);
 if exists(select 1 from public.website_project_team_members where responsibilities is null or cardinality(responsibilities)=0) then raise exception 'Legacy membership not preserved';end if;
 if has_function_privilege('authenticated','private_website_lab.placement_responsibilities(text,jsonb,text,text[],boolean)','EXECUTE') then raise exception 'Internal helper exposed';end if;
 insert into responsibility_results values('legacy placements preserved; no helper permission expansion',true);
end $test$;
select * from responsibility_results;
rollback;
