-- Staging preview records only. No email worker is invoked.
begin;
do $seed$
declare tid uuid; actor uuid; mid uuid;
begin
 select id into tid from public.website_project_teams where label='[STAGING TEST] Lab transfer QA';
 select a.user_id into actor from private_website_lab.admins a join auth.users u on u.id=a.user_id where lower(u.email)='taiwo.olaoluwaj@gmail.com';
 if tid is null or actor is null then raise exception 'Staging demo team/admin missing';end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 if not exists(select 1 from private_website_lab.meetings where team_id=tid and topic='[DEMO] Weekly delivery check-in') then
  perform public.website_lab('meeting_save',jsonb_build_object('team_id',tid,'topic','[DEMO] Weekly delivery check-in','agenda','Synthetic preview only. This example.invalid join link is not a real meeting room. No emails will be sent.','starts_at',date_trunc('day',now())+interval '1 day 19 hours','ends_at',date_trunc('day',now())+interval '1 day 20 hours','time_zone','Europe/London','join_url','https://example.invalid/mettelo-demo-meeting','client_nonce',gen_random_uuid()));
 end if;
 if not exists(select 1 from private_website_lab.support_cases where team_id=tid and subject='[DEMO] Clarify the first milestone') then
  perform public.website_lab('support_create',jsonb_build_object('team_id',tid,'category','scope','subject','[DEMO] Clarify the first milestone','description','Synthetic preview enquiry for checking the private support workflow. This is not a real team problem or member report.'));
 end if;
end $seed$;
commit;
