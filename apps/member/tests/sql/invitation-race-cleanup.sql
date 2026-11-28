-- Remove only the two synthetic race identities and their isolated teams.
begin;
drop function if exists public.website_uat_invitation_race(uuid);
create temp table invitation_race_users as select id from auth.users where email like 'uat-invitation-race-%@example.invalid';
create temp table invitation_race_teams as select distinct team_id id from public.website_project_team_members where user_id in(select id from invitation_race_users);
do $boundary$begin
 if exists(select 1 from public.website_project_teams where id in(select id from invitation_race_teams) and label not like '[UAT INVITATION RACE]%')
 or exists(select 1 from public.website_project_team_members where team_id in(select id from invitation_race_teams) and user_id not in(select id from invitation_race_users)) then raise exception 'Invitation race fixture boundary violation';end if;
end $boundary$;
update public.website_project_teams set status='completed' where id in(select id from invitation_race_teams);
delete from private_website_lab.journey_mail where recipient_id in(select id from invitation_race_users);
delete from private_website_lab.notifications where recipient_id in(select id from invitation_race_users) or team_id in(select id from invitation_race_teams);
delete from private_website_lab.project_email_previews where recipient_id in(select id from invitation_race_users);
delete from private_website_lab.mail_outbox where user_id in(select id from invitation_race_users);
delete from private_website_lab.work_skills where item_id in(select id from private_website_lab.items where team_id in(select id from invitation_race_teams));
delete from private_website_lab.items where team_id in(select id from invitation_race_teams);
delete from private_website_lab.audit where team_id in(select id from invitation_race_teams) or actor_id in(select id from invitation_race_users);
delete from public.website_project_team_members where team_id in(select id from invitation_race_teams);
delete from private_website_lab.market_requests where team_id in(select id from invitation_race_teams);
delete from private_website_lab.market_recruitment where team_id in(select id from invitation_race_teams);
delete from private_website_lab.interest_reviews where interest_id in(select id from public.website_project_interests where user_id in(select id from invitation_race_users));
delete from public.website_project_teams where id in(select id from invitation_race_teams);
delete from public.website_project_interests where user_id in(select id from invitation_race_users);
delete from auth.users where id in(select id from invitation_race_users);
notify pgrst,'reload schema';
commit;
