-- Run ONLY on V2 staging. All synthetic records and updates roll back.
begin;
do $$ declare tid uuid; lead uuid; member uuid; other uuid; begin
 select t.id,t.coordinator_id into tid,lead from public.website_project_teams t where t.status='active' and t.lab_enabled and exists(select 1 from public.website_project_team_members m where m.team_id=t.id and m.user_id=t.coordinator_id and m.status='confirmed' and m.admitted_at is not null) and (select count(*) from public.website_project_team_members m where m.team_id=t.id and m.status='confirmed' and m.admitted_at is not null)>1 limit 1;
 assert tid is not null,'An active staging pilot with admitted coordinator/member is required';
 select user_id into member from public.website_project_team_members where team_id=tid and user_id<>lead and status='confirmed' and admitted_at is not null limit 1;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('10000000-0000-4000-8000-000000000841','home-outsider@example.test',now(),'{}'),('10000000-0000-4000-8000-000000000842','home-unverified@example.test',null,'{}');
 perform set_config('test.home.team',tid::text,true);perform set_config('test.home.lead',lead::text,true);perform set_config('test.home.member',member::text,true);
 insert into private_website_lab.items(id,team_id,kind,title,body,url,owner_id,author_id,collaboration) values
 ('10000000-0000-4000-8000-000000000851',tid,'contribution','[ROLLBACK QA] evidence','Synthetic delivery evidence for a rollback-only test.','https://github.com/example/home-test',member,member,'Synthetic collaboration evidence for a rollback-only test.'),
 ('10000000-0000-4000-8000-000000000852',tid,'milestone','[ROLLBACK QA] outcome','Synthetic agreed milestone outcome.',null,member,lead,'');
 perform private_website_lab.notify_member(member,'qa-dedupe','[ROLLBACK QA] notice','/member');
 perform private_website_lab.notify_member(member,'qa-dedupe','[ROLLBACK QA] notice','/member');
 assert (select count(*) from private_website_lab.notifications where recipient_id=member and event_key='qa-dedupe')=1;
 perform set_config('test.home.notice',(select id::text from private_website_lab.notifications where recipient_id=member and event_key='qa-dedupe'),true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.home.member'),true);
do $$ declare r jsonb; before_count integer; begin
 r:=public.website_member_home('progress');perform set_config('test.home.milestones',r->>'milestones',true);
 perform public.website_member_home('record_skills',jsonb_build_object('team_id',current_setting('test.home.team'),'item_id','10000000-0000-4000-8000-000000000851','skills','SQL, sql, data modelling'));
 r:=public.website_member_home('progress');assert (r->>'skills')::int>=2;
 begin perform public.website_member_home('accept_milestone',jsonb_build_object('team_id',current_setting('test.home.team'),'item_id','10000000-0000-4000-8000-000000000852','evidence_id','10000000-0000-4000-8000-000000000851','note','The evidence meets the agreed outcome.'));raise exception 'Member accepted own milestone';exception when insufficient_privilege then null;end;
 r:=public.website_member_home('read',jsonb_build_object('id',current_setting('test.home.notice')));assert exists(select 1 from jsonb_array_elements(r->'items') n where n->>'id'=current_setting('test.home.notice') and n->>'read_at' is not null);
 r:=public.website_member_home('notifications');assert exists(select 1 from jsonb_array_elements(r->'items') n where n->>'id'=current_setting('test.home.notice') and n->>'read_at' is not null);
 r:=public.website_member_home('unread',jsonb_build_object('id',current_setting('test.home.notice')));assert exists(select 1 from jsonb_array_elements(r->'items') n where n->>'id'=current_setting('test.home.notice') and n->>'read_at' is null);
 r:=public.website_member_home('read_all',jsonb_build_object('before',r->>'as_of'));assert (r->>'unread')::int=0;
 begin perform 1 from private_website_lab.notifications;raise exception 'Private notification read allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.home.lead'),true);
do $$ begin
 perform public.website_member_home('accept_milestone',jsonb_build_object('team_id',current_setting('test.home.team'),'item_id','10000000-0000-4000-8000-000000000852','evidence_id','10000000-0000-4000-8000-000000000851','note','The evidence meets the agreed outcome.'));
 -- Repeated acceptance is idempotent.
 perform public.website_member_home('accept_milestone',jsonb_build_object('team_id',current_setting('test.home.team'),'item_id','10000000-0000-4000-8000-000000000852','evidence_id','10000000-0000-4000-8000-000000000851','note','The evidence meets the agreed outcome.'));
 begin perform public.website_member_home('record_skills',jsonb_build_object('team_id',current_setting('test.home.team'),'item_id','10000000-0000-4000-8000-000000000851','skills','Python'));raise exception 'Coordinator changed another member skills';exception when insufficient_privilege then null;end;
 begin perform public.website_member_home('confirm_delivery',jsonb_build_object('team_id',current_setting('test.home.team'),'evidence_id','10000000-0000-4000-8000-000000000851','note','The evidence demonstrates finished delivery.'));raise exception 'Active project credited as delivered';exception when raise_exception then assert sqlerrm<>'Active project credited as delivered';end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.home.member'),true);
do $$ declare r jsonb; begin r:=public.website_member_home('progress');assert (r->>'milestones')::int=current_setting('test.home.milestones')::int+1;assert (r->>'milestones_month')::int>=1;perform set_config('test.home.delivered',r->>'delivered',true);end $$;
reset role;
do $$ declare tid uuid:=current_setting('test.home.team')::uuid; lead uuid:=current_setting('test.home.lead')::uuid; member uuid:=current_setting('test.home.member')::uuid; iid uuid; sid uuid; mid uuid; begin
 -- Genuine database events produce deduplicated, recipient-scoped notices.
 insert into private_website_lab.items(team_id,kind,title,author_id,owner_id) values(tid,'task','[ROLLBACK QA] task',lead,member) returning id into iid;
 update private_website_lab.items set status='in_progress',updated_at=clock_timestamp() where id=iid;
 update private_website_lab.items set status='ready_for_review',updated_at=clock_timestamp() where id=iid;
 assert exists(select 1 from private_website_lab.notifications where recipient_id=lead and event_key like 'review-needed:'||iid||':%');
 insert into private_website_lab.items(team_id,kind,title,body,author_id,mentioned_user_ids) values(tid,'message','[ROLLBACK QA] mention','Synthetic message, containing no real user content.',lead,array[member]) returning id into iid;
 assert exists(select 1 from private_website_lab.notifications where recipient_id=member and event_key='message:'||iid||':mention');
 update private_website_lab.items set body='Edited synthetic message, still mentioning the same member.' where id=iid;
 assert (select count(*) from private_website_lab.notifications where recipient_id=member and event_key='message:'||iid||':mention')=1;
 insert into private_website_lab.support_cases(team_id,reporter_id,category,subject,description) values(tid,member,'other','[ROLLBACK QA] support','Synthetic support case for rollback-only tests.') returning id into sid;
 insert into private_website_lab.support_replies(case_id,author_id,body,internal) values(sid,lead,'Internal QA note',true) returning id into iid;
 assert not exists(select 1 from private_website_lab.notifications where event_key='support:'||iid);
 insert into private_website_lab.support_replies(case_id,author_id,body) values(sid,lead,'Public QA reply') returning id into iid;
 assert exists(select 1 from private_website_lab.notifications where recipient_id=member and event_key='support:'||iid and href='/member/enquiries/'||sid);
 insert into private_website_lab.meetings(team_id,organiser_id,topic,starts_at,ends_at,time_zone,join_url) values(tid,lead,'[ROLLBACK QA] meeting',now()+interval '1 day',now()+interval '1 day 1 hour','Europe/London','https://example.com/meeting') returning id into mid;
 update private_website_lab.meetings set revision=2,status='cancelled' where id=mid;
 assert (select count(*) from private_website_lab.notifications where recipient_id=member and event_key in ('meeting:'||mid||':1','meeting:'||mid||':2'))=2;
 update auth.users set encrypted_password='rollback-only-synthetic-value' where id='10000000-0000-4000-8000-000000000841';
 assert exists(select 1 from private_website_lab.notifications where recipient_id='10000000-0000-4000-8000-000000000841' and event_key like 'security:%');
 -- Complete only within this rollback transaction, to exercise delivery recognition.
 update private_website_lab.items set status='done',milestone_accepted_at=case when kind='milestone' then now() else milestone_accepted_at end,milestone_accepted_by=case when kind='milestone' then lead else milestone_accepted_by end,milestone_evidence_id=case when kind='milestone' then '10000000-0000-4000-8000-000000000851'::uuid else milestone_evidence_id end where team_id=tid and kind in ('task','milestone');
 update public.website_project_teams set status='completed' where id=tid;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.home.lead'),true);
do $$ begin perform public.website_member_home('confirm_delivery',jsonb_build_object('team_id',current_setting('test.home.team'),'evidence_id','10000000-0000-4000-8000-000000000851','note','The evidence demonstrates the finished project outcome.'));perform public.website_member_home('confirm_delivery',jsonb_build_object('team_id',current_setting('test.home.team'),'evidence_id','10000000-0000-4000-8000-000000000851','note','The evidence demonstrates the finished project outcome.'));end $$;
select set_config('request.jwt.claim.sub',current_setting('test.home.member'),true);
do $$ declare r jsonb; begin r:=public.website_member_home('progress');assert (r->>'delivered')::int=current_setting('test.home.delivered')::int+1;end $$;
-- Outsiders cannot see or mutate the member's notifications or work-linked skills.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000841',true);
do $$ declare r jsonb; begin
 r:=public.website_member_home('read',jsonb_build_object('id',current_setting('test.home.notice')));assert not exists(select 1 from jsonb_array_elements(r->'items') n where n->>'id'=current_setting('test.home.notice'));
 r:=public.website_member_home('progress');assert (r->>'milestones')::int=0 and (r->>'delivered')::int=0 and (r->>'skills')::int=0;
 begin perform public.website_member_home('recognition',jsonb_build_object('team_id',current_setting('test.home.team')));raise exception 'Outsider read workspace evidence';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000842',true);
do $$ begin begin perform public.website_member_home('notifications');raise exception 'Unverified allowed';exception when insufficient_privilege then null;end;end $$;
set local role anon;
do $$ begin begin perform public.website_member_home('progress');raise exception 'Anonymous allowed';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
select 'PASS: milestone and delivery acceptance, skills ownership, assignment/review/mention/meeting/support/security events, duplicate prevention, persistent read/unread, read-all, anonymous/unverified/outsider denial; all fixtures rolled back' as result;
