begin;
create index website_team_directory_order on public.website_project_teams(created_at desc,id desc);
create index website_interest_directory_order on public.website_project_interests(project_ref,submitted_at desc,id desc);
create index lab_support_team_status on private_website_lab.support_cases(team_id,status);

-- Private read models: no direct API grants, and no readiness evaluation per directory row.
create view private_website_lab.admin_team_directory with (security_invoker=true) as
select t.*,b.title as project_title,coalesce(p.full_name,'Not assigned') as coordinator_name,
 coalesce(m.confirmed,0) as confirmed,coalesce(m.offered,0) as offered,
 coalesce(c.open_cases,0) as open_cases,
 array_remove(array[
  case when m.overdue>0 then 'Resolve overdue offers' end,
  case when m.external_pending>0 then 'Review external access removal' end,
  case when t.status='paused' then 'Review paused Lab' end,
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

create view private_website_lab.admin_application_directory with (security_invoker=true) as
select i.*,coalesce(p.full_name,'Member') as name,p.headline,p.experience_level,p.skills,p.weekly_availability,
 coalesce(r.status,'new') as review_status,r.note as review_note,
 exists(select 1 from public.website_project_team_members m where m.user_id=i.user_id and m.project_ref=i.project_ref and m.status in ('offered','confirmed')) as allocated,
 exists(select 1 from private_website_lab.placement_restrictions x where x.user_id=i.user_id and x.project_ref=i.project_ref and x.cleared_at is null) as restricted,
 (select count(*) from public.website_project_teams t where t.coordinator_id=i.user_id and t.status='active') as coordinator_assignments
from public.website_project_interests i left join public.profiles p on p.id=i.user_id
left join private_website_lab.interest_reviews r on r.interest_id=i.id;
revoke all on private_website_lab.admin_application_directory from public,anon,authenticated;

create function private_website_lab.project_admin_directory(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid();project_filter text:=coalesce(nullif(p_payload->>'project',''),'all');
 section_filter text:=coalesce(nullif(p_payload->>'section',''),'attention');
 status_filter text:=coalesce(nullif(p_payload->>'status',''),'all');
 arrangement_filter text:=coalesce(nullif(p_payload->>'arrangement',''),'all');
 search_text text:=lower(btrim(coalesce(p_payload->>'q','')));
 review_filter text:=coalesce(nullif(p_payload->>'review',''),'all');
 page_number integer:=1;page_size constant integer:=25;total bigint;rows jsonb;meta jsonb;record_json jsonb;tid uuid;iid uuid;
begin
 if actor is null or not private_website_lab.account_allowed(actor) or not private_website_lab.permitted(actor,'operations') then raise exception 'Project administrator access required' using errcode='42501';end if;
 if length(search_text)>150 or length(project_filter)>80 or coalesce(p_payload->>'page','1')!~'^[0-9]{1,6}$' then raise exception 'Invalid directory filters';end if;
 page_number:=greatest(1,coalesce((p_payload->>'page')::integer,1));
 if section_filter not in ('attention','teams','applications') or status_filter not in ('all','forming','active','paused','completed') or arrangement_filter not in ('all','solo','team','flexible') or review_filter not in ('all','new','clarification','shortlisted','declined','withdrawn') then raise exception 'Choose supported directory filters';end if;
 if p_action='team' then
  tid:=(p_payload->>'team_id')::uuid;
  select to_jsonb(t)||jsonb_build_object('readiness',private_website_lab.readiness(t.id),'members',coalesce((select jsonb_agg(jsonb_build_object(
   'user_id',m.user_id,'name',coalesce(p.full_name,'Member'),'role',array_to_string(m.responsibilities,' · '),'roles',to_jsonb(m.responsibilities),'status',m.status,
   'accepted',m.acknowledged_at is not null,'access_verified',m.access_verified_at is not null,'two_person_agreed',m.two_person_agreed_at is not null,
   'offer_expires_at',m.offer_expires_at,'commitment_confirmed',m.commitment_confirmed_at is not null,'admitted',m.admitted_at is not null,'onboarding_checked',m.onboarding_checked_at is not null,
   'external_access_revoked',m.external_access_revoked_at is not null,'assigned_open_items',(select count(*) from private_website_lab.items x where x.team_id=t.id and x.owner_id=m.user_id and x.kind in ('task','milestone') and x.status<>'done')) order by m.joined_at,m.user_id)
   from public.website_project_team_members m left join public.profiles p on p.id=m.user_id where m.team_id=t.id),'[]')) into record_json from public.website_project_teams t where t.id=tid;
  if record_json is null then raise exception 'Placement not found';end if;
  return jsonb_build_object('team',record_json);
 elsif p_action='application' then
  iid:=(p_payload->>'interest_id')::uuid;
  select to_jsonb(a)||jsonb_build_object('role',a.primary_role,'profile',jsonb_build_object('headline',a.headline,'experience_level',a.experience_level,'skills',a.skills,'weekly_availability',a.weekly_availability)) into record_json from private_website_lab.admin_application_directory a where a.id=iid;
  if record_json is null then raise exception 'Application not found';end if;
  return jsonb_build_object('interest',record_json);
 elsif p_action in ('list','candidates') then
  if p_action='candidates' then
   if project_filter='all' or arrangement_filter not in ('solo','team') then raise exception 'Choose one project and working arrangement';end if;
   select count(*) into total from private_website_lab.admin_application_directory a where a.project_ref=project_filter and a.review_status='shortlisted' and not a.allocated and not a.restricted and a.participation in (arrangement_filter,'flexible') and coalesce(a.answers->>'commitment_response','')<>'no' and (search_text='' or strpos(lower(a.name||' '||coalesce(a.primary_role,'')),search_text)>0);
   page_number:=least(page_number,greatest(1,ceil(total/25.0)::integer));
   select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('role',a.primary_role,'profile',jsonb_build_object('headline',a.headline,'experience_level',a.experience_level,'skills',a.skills,'weekly_availability',a.weekly_availability)) order by a.submitted_at,a.id),'[]') into rows from
    (select * from private_website_lab.admin_application_directory a where a.project_ref=project_filter and a.review_status='shortlisted' and not a.allocated and not a.restricted and a.participation in (arrangement_filter,'flexible') and coalesce(a.answers->>'commitment_response','')<>'no' and (search_text='' or strpos(lower(a.name||' '||coalesce(a.primary_role,'')),search_text)>0) order by a.submitted_at,a.id limit page_size offset (page_number-1)*page_size) a;
   return jsonb_build_object('rows',rows,'total',total,'page',page_number,'page_size',page_size);
  end if;
  select jsonb_build_object('projects',(select coalesce(jsonb_agg(jsonb_build_object('ref',b.project_ref,'title',b.title,'roles',b.roles,'member_capacity',s.member_capacity) order by b.project_ref),'[]') from public.website_project_briefs b left join public.website_project_pilot_settings s on s.project_ref=b.project_ref),
   'metrics',jsonb_build_object(
    'applications',(select count(*) from private_website_lab.admin_application_directory a where (project_filter='all' or a.project_ref=project_filter) and a.review_status='new' and not a.allocated),
    'attention',(select count(*) from private_website_lab.admin_team_directory t where (project_filter='all' or t.project_ref=project_filter) and cardinality(t.actions)>0),
    'active',(select count(*) from public.website_project_teams t where (project_filter='all' or t.project_ref=project_filter) and t.status='active'),
    'enquiries',(select count(*) from private_website_lab.support_cases c left join public.website_project_teams t on t.id=c.team_id where c.team_id is not null and (project_filter='all' or t.project_ref=project_filter) and c.status not in ('resolved','closed')))) into meta;
  if section_filter='applications' then
   select count(*) into total from private_website_lab.admin_application_directory a where (project_filter='all' or a.project_ref=project_filter) and (review_filter='all' or a.review_status=review_filter) and (arrangement_filter='all' or a.participation=arrangement_filter) and (search_text='' or strpos(lower(a.name||' '||a.project_ref||' '||coalesce(a.primary_role,'')),search_text)>0);
   page_number:=least(page_number,greatest(1,ceil(total/25.0)::integer));
   select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'project_ref',a.project_ref,'role',a.primary_role,'participation',a.participation,'review_status',a.review_status,'allocated',a.allocated,'restricted',a.restricted,'submitted_at',a.submitted_at) order by a.submitted_at,a.id),'[]') into rows from
    (select * from private_website_lab.admin_application_directory a where (project_filter='all' or a.project_ref=project_filter) and (review_filter='all' or a.review_status=review_filter) and (arrangement_filter='all' or a.participation=arrangement_filter) and (search_text='' or strpos(lower(a.name||' '||a.project_ref||' '||coalesce(a.primary_role,'')),search_text)>0) order by a.submitted_at,a.id limit page_size offset (page_number-1)*page_size) a;
  else
   select count(*) into total from private_website_lab.admin_team_directory t where (project_filter='all' or t.project_ref=project_filter) and (status_filter='all' or t.status=status_filter) and (section_filter<>'teams' or status_filter<>'all' or t.status<>'completed') and (section_filter<>'attention' or cardinality(t.actions)>0) and (arrangement_filter='all' or t.participation=arrangement_filter) and (search_text='' or strpos(lower(t.label||' '||t.project_ref||' '||t.project_title||' '||t.coordinator_name),search_text)>0 or exists(select 1 from public.website_project_team_members m join public.profiles p on p.id=m.user_id where m.team_id=t.id and m.status in ('offered','confirmed') and strpos(lower(coalesce(p.full_name,'')),search_text)>0));
   page_number:=least(page_number,greatest(1,ceil(total/25.0)::integer));
   select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'label',t.label,'project_ref',t.project_ref,'project_title',t.project_title,'participation',t.participation,'coordinator_name',t.coordinator_name,'confirmed',t.confirmed,'maximum_members',t.maximum_members,'status',t.status,'actions',t.actions,'created_at',t.created_at,'open_cases',t.open_cases) order by t.priority,t.created_at,t.id),'[]') into rows from
    (select * from private_website_lab.admin_team_directory t where (project_filter='all' or t.project_ref=project_filter) and (status_filter='all' or t.status=status_filter) and (section_filter<>'teams' or status_filter<>'all' or t.status<>'completed') and (section_filter<>'attention' or cardinality(t.actions)>0) and (arrangement_filter='all' or t.participation=arrangement_filter) and (search_text='' or strpos(lower(t.label||' '||t.project_ref||' '||t.project_title||' '||t.coordinator_name),search_text)>0 or exists(select 1 from public.website_project_team_members m join public.profiles p on p.id=m.user_id where m.team_id=t.id and m.status in ('offered','confirmed') and strpos(lower(coalesce(p.full_name,'')),search_text)>0)) order by t.priority,t.created_at,t.id limit page_size offset (page_number-1)*page_size) t;
  end if;
  return meta||jsonb_build_object('rows',rows,'total',total,'page',page_number,'page_size',page_size);
 else raise exception 'Unsupported project directory action';end if;
end $$;
revoke all on function private_website_lab.project_admin_directory(text,jsonb) from public,anon,authenticated;
grant execute on function private_website_lab.project_admin_directory(text,jsonb) to authenticated;
create function public.website_project_admin_directory(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private_website_lab.project_admin_directory(p_action,p_payload) $$;
revoke all on function public.website_project_admin_directory(text,jsonb) from public,anon,authenticated;
grant execute on function public.website_project_admin_directory(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
