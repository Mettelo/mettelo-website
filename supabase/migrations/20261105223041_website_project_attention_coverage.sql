begin;
create or replace view private_website_lab.admin_team_directory with (security_invoker=true) as
select t.*,b.title as project_title,coalesce(p.full_name,'Not assigned') as coordinator_name,
 coalesce(m.confirmed,0) as confirmed,coalesce(m.offered,0) as offered,
 coalesce(c.open_cases,0) as open_cases,
 array_remove(array[
  case when m.overdue>0 then 'Resolve overdue offers' end,
  case when m.external_pending>0 then 'Review external access removal' end,
  case when t.status='paused' then 'Review paused Lab' end,
  case when t.status='forming' and (select count(*) from public.website_project_teams a where a.project_ref=t.project_ref and a.status='active')>=(select max_active_teams from public.website_project_pilot_settings s where s.project_ref=t.project_ref) then 'Review project Lab capacity' end,
  case when t.status in ('forming','active') and coalesce(m.confirmed,0)>0 and exists(select 1 from unnest(t.required_roles) r where not exists(select 1 from public.website_project_team_members x where x.team_id=t.id and x.status='confirmed' and r=any(x.responsibilities))) then 'Review essential responsibility coverage' end,
  case when t.status='forming' and t.lab_enabled and exists(select 1 from private_website_lab.items x where x.team_id=t.id and x.kind='milestone' and (x.owner_id is null or not exists(select 1 from public.website_project_team_members y where y.team_id=t.id and y.user_id=x.owner_id and y.status='confirmed'))) then 'Assign milestone owners' end,
  case when t.status='forming' and (t.coordinator_id is null or (t.participation='team' and t.coordinator_agreed_at is null)) then 'Confirm coordinator or Solo owner' end,
  case when t.status in ('forming','active') and m.access_pending>0 then 'Verify repository access' end,
  case when t.status in ('forming','active') and m.commitments_pending>0 then 'Follow up working commitments' end,
  case when t.status='active' and m.onboarding_pending>0 then 'Review member admission' end,
  case when t.status='forming' and coalesce(m.confirmed,0)+coalesce(m.offered,0)<t.minimum_members then 'Fill open places' end,
  case when c.open_cases>0 then 'Respond to project enquiries' end,
  case when t.status='forming' and not t.lab_enabled and t.coordinator_id is not null then 'Prepare starter workspace' end
 ],null) as actions,
 case when m.overdue>0 then 0 when m.external_pending>0 then 1 when t.status='paused' then 2 else 3 end as priority
from public.website_project_teams t
join public.website_project_briefs b on b.project_ref=t.project_ref
left join public.profiles p on p.id=t.coordinator_id
left join (select team_id,
 count(*) filter(where status='confirmed') as confirmed,
 count(*) filter(where status='offered') as offered,
 count(*) filter(where status='offered' and offer_expires_at<now()) as overdue,
 count(*) filter(where status='confirmed' and access_verified_at is null) as access_pending,
 count(*) filter(where status='confirmed' and commitment_confirmed_at is null) as commitments_pending,
 count(*) filter(where status='confirmed' and admitted_at is null) as onboarding_pending,
 count(*) filter(where status not in ('confirmed','offered') and external_access_revoked_at is null) as external_pending
 from public.website_project_team_members group by team_id) m on m.team_id=t.id
left join (select team_id,count(*) as open_cases from private_website_lab.support_cases where status not in ('resolved','closed') group by team_id) c on c.team_id=t.id;
revoke all on private_website_lab.admin_team_directory from public,anon,authenticated;


commit;
