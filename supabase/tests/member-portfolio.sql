-- V2 staging only. Synthetic evidence and temporary access changes all roll back.
begin;
do $$ declare tid uuid; actor uuid; reviewer uuid; first_evidence uuid; begin
 select t.id,t.coordinator_id into tid,reviewer from public.website_project_teams t where t.status='active' and t.lab_enabled and exists(select 1 from public.website_project_team_members m where m.team_id=t.id and m.user_id<>t.coordinator_id and m.status='confirmed' and m.admitted_at is not null) limit 1;
 select user_id into actor from public.website_project_team_members where team_id=tid and user_id<>reviewer and status='confirmed' and admitted_at is not null limit 1;
 assert actor is not null,'An isolated staging pilot with admitted coordinator/member is required';
 perform set_config('test.portfolio.team',tid::text,true);perform set_config('test.portfolio.actor',actor::text,true);perform set_config('test.portfolio.reviewer',reviewer::text,true);
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('10000000-0000-4000-8000-000000000971','portfolio-outsider@example.test',now(),'{}'),('10000000-0000-4000-8000-000000000972','portfolio-unverified@example.test',null,'{}');
 insert into private_website_lab.items(team_id,kind,title,body,url,author_id,owner_id,created_at)
 select tid,'contribution','[PORTFOLIO-QA] work '||lpad(n::text,2,'0'),'Synthetic individual outcome and supporting repository evidence.','https://github.com/example/portfolio-qa',actor,actor,'2026-11-01T10:00:00Z'::timestamptz from generate_series(1,55) n;
 select id into first_evidence from private_website_lab.items where title='[PORTFOLIO-QA] work 01' and author_id=actor;
 insert into private_website_lab.work_skills(item_id,skill) values(first_evidence,'sql'),(first_evidence,'data modelling');
 insert into private_website_lab.items(team_id,kind,title,body,url,author_id,deleted_at) values(tid,'contribution','[PORTFOLIO-QA] other member','Other member evidence must not become my achievement.','https://github.com/example/portfolio-other',reviewer,null),(tid,'contribution','[PORTFOLIO-QA] deleted','Deleted evidence must not appear.','https://github.com/example/deleted',actor,now());
 insert into private_website_lab.items(team_id,kind,title,body,owner_id,author_id,status,milestone_accepted_at,milestone_accepted_by,milestone_evidence_id,milestone_review_note)
 values(tid,'milestone','[PORTFOLIO-QA] reviewed milestone','Agreed personal milestone outcome.',actor,reviewer,'done',now(),reviewer,first_evidence,'Evidence was accepted by an authorised reviewer.'),(tid,'milestone','[PORTFOLIO-QA] self acceptance','An acceptance without a separate reviewer.',actor,actor,'done',now(),actor,first_evidence,'Recorded without independent review.');
 -- A completed task alone must not become an achievement record.
 insert into private_website_lab.items(team_id,kind,title,body,owner_id,author_id,status) values(tid,'task','[PORTFOLIO-QA] completed task','Task completion alone is not evidence.',actor,actor,'done');
 perform set_config('test.portfolio.evidence',first_evidence::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.portfolio.actor'),true);
do $$ declare a jsonb;b jsonb;c jsonb;r jsonb; begin
 a:=public.website_member_portfolio('contribution','[PORTFOLIO-QA]',1);b:=public.website_member_portfolio('contribution','[PORTFOLIO-QA]',2);c:=public.website_member_portfolio('contribution','[PORTFOLIO-QA]',3);
 assert (a->>'total')::int=55 and jsonb_array_length(a->'rows')=25 and jsonb_array_length(b->'rows')=25 and jsonb_array_length(c->'rows')=5,'Pagination must be 25/25/5';
 assert (select count(distinct x->>'id') from jsonb_array_elements((a->'rows')||(b->'rows')||(c->'rows'))x)=55,'Page order must not duplicate tied timestamps';
 assert public.website_member_portfolio('contribution','[PORTFOLIO-QA]',1)->'rows'=a->'rows','Ordering must be stable';
 assert (public.website_member_portfolio('contribution','[PORTFOLIO-QA]',999)->>'page')::int=3,'Stale pages clamp';
 assert (public.website_member_portfolio('all','[PORTFOLIO-QA] work 01',1)->>'total')::int=1,'Search must scope records';
 r:=public.website_member_portfolio('milestone','[PORTFOLIO-QA]',1);
 assert (r->>'total')::int=2;
 assert exists(select 1 from jsonb_array_elements(r->'rows')x where x->>'review_state'='reviewed') and exists(select 1 from jsonb_array_elements(r->'rows')x where x->>'review_state'='acceptance-recorded'),'Self acceptance must not claim separate review';
 assert (public.website_member_portfolio('all','[PORTFOLIO-QA]',1)->>'total')::int=57,'Other people, deleted records and tasks must be excluded';
 begin perform public.website_member_portfolio('unknown','',1);raise exception 'Invalid kind accepted';exception when invalid_parameter_value then null;end;
 begin perform public.website_member_portfolio('all','',0);raise exception 'Invalid page accepted';exception when invalid_parameter_value then null;end;
 begin perform public.website_member_portfolio('all',repeat('x',151),1);raise exception 'Unbounded search accepted';exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000971',true);
do $$begin assert (public.website_member_portfolio('all','[PORTFOLIO-QA]',1)->>'total')::int=0,'Outsider must not see evidence';end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000972',true);
do $$begin begin perform public.website_member_portfolio();raise exception 'Unverified user accepted';exception when insufficient_privilege then null;end;end $$;
reset role;
do $$begin assert not has_function_privilege('anon','public.website_member_portfolio(text,text,integer)','EXECUTE');end $$;
savepoint portfolio_states;
update public.website_project_teams set status='completed' where id=current_setting('test.portfolio.team')::uuid;
insert into private_website_lab.deliveries(team_id,evidence_id,confirmed_by,note) values(current_setting('test.portfolio.team')::uuid,current_setting('test.portfolio.evidence')::uuid,current_setting('test.portfolio.reviewer')::uuid,'Synthetic confirmed team delivery with personal contribution evidence.');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.portfolio.actor'),true);
do $$begin assert exists(select 1 from jsonb_array_elements(public.website_member_portfolio('delivery','',1)->'rows')x where x->>'team_id'=current_setting('test.portfolio.team') and x->>'review_state'='team-outcome'),'Completed delivery needs shared team outcome label';end $$;
reset role;
update public.website_project_teams set status='paused' where id=current_setting('test.portfolio.team')::uuid;
set local role authenticated;
do $$begin assert (public.website_member_portfolio('all','[PORTFOLIO-QA]',1)->>'total')::int=0,'Paused Lab must preserve existing access restriction';end $$;
reset role;
rollback to savepoint portfolio_states;
-- Revocation immediately removes access without retaining a portfolio snapshot.
update public.website_project_team_members set admitted_at=null where team_id=current_setting('test.portfolio.team')::uuid and user_id=current_setting('test.portfolio.actor')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.portfolio.actor'),true);
do $$begin assert (public.website_member_portfolio('all','[PORTFOLIO-QA]',1)->>'total')::int=0,'Revoked access must remove records';end $$;
reset role;
select 'Portfolio pagination, search, labels, authorship, deleted data, anonymous/unverified/outsider access and revocation passed; all fixtures rolled back.' as result;
rollback;
