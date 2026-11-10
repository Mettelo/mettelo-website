begin;
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

create temp table unified_feed_results(check_name text,passed boolean);
do $test$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();staff uuid;refs text[];tid uuid;role_name text;idea uuid;r jsonb;lastrow jsonb;seen uuid[]:='{}';item jsonb;denied boolean;counted integer:=0;idx integer;page_payload jsonb;token text:='UnifiedFeedFixture'||replace(gen_random_uuid()::text,'-','');
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select array_agg(project_ref order by project_ref) into refs from(select project_ref from public.website_project_briefs order by project_ref limit 2)x;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) select x,'unified-feed-'||x||'@example.invalid',now(),jsonb_build_object('full_name','Synthetic unified feed member') from unnest(array[a,b])x;
 perform set_config('request.jwt.claim.sub',b::text,true);
 idea:=(public.website_lab_community('publish',jsonb_build_object('kind','idea','body',token||' Public idea for discussion.','client_nonce',gen_random_uuid()))->>'post_id')::uuid;
 if exists(select 1 from public.website_project_teams where coordinator_id=b) then raise exception 'Discussion idea created a Lab';end if;
 denied:=false;begin perform public.website_lab_community('publish',jsonb_build_object('kind','project','body',token||' Ungoverned project post','client_nonce',gen_random_uuid()));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Project post bypassed leadership';end if;
 tid:=pg_temp.fixture_offer(staff,a,refs[1]);
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.website_lab('respond',jsonb_build_object('team_id',tid,'response','accept','commitment_confirmed','true'));
 perform set_config('request.jwt.claim.sub',staff::text,true);perform public.website_lab('verify_access',jsonb_build_object('team_id',tid,'user_id',a,'reason','Rollback unified feed fixture access check'));perform public.website_lab_market('capacity',jsonb_build_object('team_id',tid,'capacity',1));
 select roles->>0 into role_name from public.website_project_briefs where project_ref=refs[1];
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.website_lab_market('recruitment',jsonb_build_object('team_id',tid,'open',true,'description',token||' Public recruiting Lab.','commitment','Two hours weekly','roles',jsonb_build_array(role_name),'skills',jsonb_build_array('SQL')));
 perform public.website_lab_community('publish',jsonb_build_object('kind','project','body',token||' Public project update.','team_id',tid,'client_nonce',gen_random_uuid()));
 perform public.website_lab_community('publish',jsonb_build_object('kind','collaborators','body',token||' Public collaboration request.','team_id',tid,'client_nonce',gen_random_uuid()));
 -- Private fixture table writes stay inside this transaction; never published through the UI.
 insert into private_website_lab.market_proposals(owner_id,title,description,state,project_ref,reviewed_at,review_note)
 values(b,token||' Approved member project',token||' Approved public description.','approved',refs[2],now(),'PRIVATE_REVIEW_SENTINEL');
 insert into private_website_lab.market_proposals(owner_id,title,description,state,review_note)
 values(b,token||' PRIVATE_DRAFT_SENTINEL',token||' PRIVATE_BODY_SENTINEL','draft','PRIVATE_REVIEW_SENTINEL'),(b,token||' PRIVATE_SUBMITTED_SENTINEL',token||' PRIVATE_BODY_SENTINEL','submitted','PRIVATE_REVIEW_SENTINEL');
 insert into private_website_lab.market_posts(author_id,kind,body,topics,client_nonce,created_at)
 select b,'update',token||' Public scale update '||n,array['SQL'],gen_random_uuid(),now()-interval '1 day'-(n/3)*interval '1 second' from generate_series(1,1000)n;
 perform set_config('request.jwt.claim.sub',b::text,true);
 page_payload:=jsonb_build_object('q',token);r:=public.website_lab_community('feed',page_payload);
 if jsonb_array_length(r->'rows')<>25 then raise exception 'Mixed feed page not bounded at 25';end if;
 if not exists(select 1 from jsonb_array_elements(r->'rows')x where x->>'entry_type'='project') or not exists(select 1 from jsonb_array_elements(r->'rows')x where x->>'entry_type'='proposal') then raise exception 'Public sources not mixed';end if;
 if exists(select 1 from jsonb_array_elements(r->'rows')x where x->>'entry_type'='proposal' and coalesce(x->>'author_id','')<>'') then raise exception 'Private proposal ownership leaked';end if;
 if r::text ~ 'PRIVATE_|review_note|client_nonce|reviewed_by' then raise exception 'Private fields leaked';end if;
 loop
  for item in select value from jsonb_array_elements(r->'rows') loop
   if (item->>'id')::uuid=any(seen) then raise exception 'Cursor repeated an entry';end if;
   seen:=array_append(seen,(item->>'id')::uuid);counted:=counted+1;
  end loop;
  exit when jsonb_array_length(r->'rows')<25;
  lastrow:=r->'rows'->24;r:=public.website_lab_community('feed',page_payload||jsonb_build_object('before_at',lastrow->>'created_at','before_id',lastrow->>'id'));
 end loop;
 if counted<>1005 then raise exception 'Expected 1005 mixed entries, got %',counted;end if;
 insert into unified_feed_results values('1005 mixed public entries paginate in stable 25-item pages without duplicates or private drafts/review data',true);
 r:=public.website_lab_community('feed',jsonb_build_object('q',token,'category','ideas'));if jsonb_array_length(r->'rows')<>2 then raise exception 'Idea filter wrong: %',r;end if;
 r:=public.website_lab_community('feed',jsonb_build_object('q',token,'category','projects'));if jsonb_array_length(r->'rows')<>3 then raise exception 'Project filter wrong: %',r;end if;
 r:=public.website_lab_community('feed',jsonb_build_object('q',token,'category','seeking'));if jsonb_array_length(r->'rows')<>2 then raise exception 'Seeking filter wrong: %',r;end if;
 perform public.website_lab_community('bookmark',jsonb_build_object('post_id',idea));r:=public.website_lab_community('feed',jsonb_build_object('q',token,'view','bookmarks'));if jsonb_array_length(r->'rows')<>1 or r->'rows'->0->>'id'<>idea::text then raise exception 'Saved feed leaked unmarked entries';end if;
 perform public.website_lab_community('follow',jsonb_build_object('member_id',a));r:=public.website_lab_community('feed',jsonb_build_object('q',token,'view','following'));if jsonb_array_length(r->'rows')<>3 then raise exception 'Following mixed sources wrong: %',r;end if;
 insert into unified_feed_results values('server-side Projects, Ideas, Seeking, Saved and Following filters apply before pagination',true);
 perform public.website_lab_community('block',jsonb_build_object('member_id',a));r:=public.website_lab_community('feed',jsonb_build_object('q',token,'category','projects'));
 if jsonb_array_length(r->'rows')<>1 or r->'rows'->0->>'entry_type'<>'proposal' then raise exception 'Block did not hide leader posts/listing';end if;
 perform set_config('request.jwt.claim.sub','',true);denied:=false;begin perform public.website_lab_community('feed');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Unauthenticated feed allowed';end if;
 insert into unified_feed_results values('blocked leaders and their opportunities stay hidden, idea posting creates no Lab, project posts require governed leadership and verified sign-in',true);
end $test$;
select * from unified_feed_results;
rollback;
