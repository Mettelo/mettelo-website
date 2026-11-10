-- Delete only the isolated race identities and their attached fixture records.
begin;
create temp table race_users as select id from auth.users where email like 'participation-race-%@example.invalid';
create temp table race_teams as select distinct team_id id from public.website_project_team_members where user_id in(select id from race_users);
do $$begin
 if exists(select 1 from public.website_project_teams where id in(select id from race_teams) and label not like '[PARTICIPATION RACE]%') then raise exception 'Fixture boundary violation';end if;
end $$;
update public.website_project_teams set status='completed' where id in(select id from race_teams);
delete from private_website_lab.notifications where recipient_id in(select id from race_users) or team_id in(select id from race_teams);
delete from private_website_lab.project_email_previews where recipient_id in(select id from race_users);
delete from private_website_lab.audit where team_id in(select id from race_teams);
delete from public.website_project_team_members where user_id in(select id from race_users);
delete from public.website_project_teams where id in(select id from race_teams);
delete from private_website_lab.interest_reviews where interest_id in(select id from public.website_project_interests where user_id in(select id from race_users));
delete from public.website_project_interests where user_id in(select id from race_users);
delete from auth.users where id in(select id from race_users);
commit;
