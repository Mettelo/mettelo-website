-- A source review can replace missing activation accounts, never missing
-- confirmed people or a recorded coordinator in an existing active team.
do $fix$
declare source text;
begin
 source:=pg_get_functiondef('private_legacy_roster.prepare_workspaces(text,text)'::regprocedure);
 if strpos(source,'ready and not exists(select 1 from private_legacy_roster.allocations where batch_key=p_batch and group_key=g.group_key and eligible_access)')=0 then raise exception 'Unexpected existing-team review guard';end if;
 source:=replace(source,'ready and not exists(select 1 from private_legacy_roster.allocations where batch_key=p_batch and group_key=g.group_key and eligible_access)',
 'ready and ((select count(*) from private_legacy_roster.allocations where batch_key=p_batch and group_key=g.group_key and recorded_status=''Confirmed'' and not contact_hold)<case when g.arrangement=''Solo'' then 1 else 2 end or not exists(select 1 from private_legacy_roster.allocations where batch_key=p_batch and group_key=g.group_key and eligible_access and source->>''sourceRole'' in (''Lead / Coordinator'',''Solo'')))');execute source;
end $fix$;
create or replace function private_website_lab.market_leader(tid uuid,uid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private_website_lab.account_allowed(uid) and exists(
  select 1 from public.website_project_teams t join public.website_project_team_members m on m.team_id=t.id and m.user_id=uid
 where t.id=tid and t.coordinator_id=uid and t.status='active' and t.lab_enabled and m.status='confirmed' and m.admitted_at is not null
 and ((m.admission_route='core' and (t.participation='solo' or t.coordinator_agreed_at is not null))
 or (m.admission_route='legacy' and exists(select 1 from private_legacy_roster.memberships l
 join private_legacy_roster.allocations a using(batch_key,source_row) join private_legacy_roster.batches b using(batch_key)
 where l.team_id=tid and l.user_id=uid and b.state='approved' and a.recorded_status='Confirmed' and not a.contact_hold and a.eligible_access and a.source->>'sourceRole' in ('Lead / Coordinator','Solo')))))
$$;
revoke all on function private_website_lab.market_leader(uuid,uuid) from public,anon,authenticated;
