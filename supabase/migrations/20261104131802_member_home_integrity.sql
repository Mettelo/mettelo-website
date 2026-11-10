begin;
create index member_delivery_evidence on private_website_lab.deliveries(evidence_id);
create index member_delivery_reviewer on private_website_lab.deliveries(confirmed_by);
create index member_milestone_reviewer on private_website_lab.items(milestone_accepted_by);
create index member_milestone_evidence on private_website_lab.items(milestone_evidence_id);
create index member_notification_team on private_website_lab.notifications(team_id);
do $upgrade$ declare source text; begin
 source:=pg_get_functiondef('private_website_lab.member_home(text,jsonb)'::regprocedure);
 source:=replace(source,'for r in select id,project_ref from public.website_project_interests where user_id=actor loop perform private_website_lab.notify_member(actor,''application:''||r.id,''Your application has been submitted'',''/member/projects/''||r.project_ref||''/interest'');end loop;',
 'insert into private_website_lab.notifications(recipient_id,event_key,title,href,created_at) select actor,''application:''||id,''Your application has been submitted'',''/member/projects/''||project_ref||''/interest'',submitted_at from public.website_project_interests where user_id=actor on conflict(recipient_id,event_key) do nothing;');
 execute source;
 source:=pg_get_functiondef('private_website_lab.member_event()'::regprocedure);
 source:=replace(source,'''Mettelo has replied to your enquiry'',''/member/enquiries''','''Mettelo has replied to your enquiry'',''/member/enquiries/''||new.case_id');
 source:=replace(source,'heading:=case when new.status=''offered''','heading:=case when tg_op=''UPDATE'' and old.admitted_at is not null and new.admitted_at is null then ''Your Lab access has changed'' when new.status=''offered''');
 source:=replace(source,'elsif tg_table_name=''website_project_teams'' then','elsif tg_table_name=''website_project_teams'' then
  if new.coordinator_nominee_id is not null and new.coordinator_nominee_id is distinct from old.coordinator_nominee_id then perform private_website_lab.notify_member(new.coordinator_nominee_id,''nomination:''||new.id||'':''||clock_timestamp(),''Please review your coordinator nomination'',''/member/lab'');end if;
  if new.coordinator_id is distinct from old.coordinator_id then
   for uid in select user_id from public.website_project_team_members where team_id=new.id and status=''confirmed'' loop perform private_website_lab.notify_member(uid,''coordinator:''||new.id||'':''||clock_timestamp(),''Your project coordinator has changed'',''/member/lab'');end loop;
  end if;');
 execute source;
end $upgrade$;
drop trigger member_team_notice on public.website_project_teams;
create trigger member_team_notice after update of status,coordinator_id,coordinator_nominee_id on public.website_project_teams for each row execute function private_website_lab.member_event();
commit;
