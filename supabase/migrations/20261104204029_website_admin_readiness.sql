begin;
-- Staff-only ownership is kept separate from member-visible enquiry records.
create table private_website_lab.support_assignments(
 source text not null check(source in ('member','public')),case_id uuid not null,
 assigned_to uuid references auth.users(id),version bigint not null default 1,
 changed_by uuid not null references auth.users(id),changed_at timestamptz not null default now(),
 primary key(source,case_id));
alter table private_website_lab.support_assignments enable row level security;
revoke all on private_website_lab.support_assignments from public,anon,authenticated;
create index support_assignment_owner on private_website_lab.support_assignments(assigned_to) where assigned_to is not null;
create function private_website_lab.admin_readiness(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();src text;p_id uuid;owner_id uuid;expected bigint;current_row private_website_lab.support_assignments;result jsonb;
begin
 if not private_website_lab.permitted(actor,'operations') then raise exception 'Operations administrator access required' using errcode='42501';end if;
 if p_action='email_status' then
  return jsonb_build_object(
   'project_previews',(select count(*) from private_website_lab.project_email_previews),
   'project_capture',(select capture_enabled from private_website_lab.project_email_preview_settings where id),
   'weekly_preparations',(select count(*) from private_website_lab.weekly_pulse_preparations),
   'weekly_last_prepared',(select max(prepared_at) from private_website_lab.weekly_pulse_preparations),
   'meeting_states',(select coalesce(jsonb_object_agg(state,n),'{}') from (select state,count(*) n from private_website_lab.mail_outbox group by state) s));
 elsif p_action='list' then
  return jsonb_build_object('assignments',(select coalesce(jsonb_agg(jsonb_build_object('source',a.source,'case_id',a.case_id,'assigned_to',a.assigned_to,'version',a.version,'owner_name',coalesce(nullif(p.full_name,''),'Staff member'),'owner_available',private_website_lab.permitted(a.assigned_to,'operations'))),'[]') from private_website_lab.support_assignments a left join public.profiles p on p.id=a.assigned_to));
 elsif p_action='case' then
  src:=p_payload->>'source';p_id:=(p_payload->>'id')::uuid;
  if src is null or src not in ('member','public') then raise exception 'Invalid source';end if;
  if (src='member' and not exists(select 1 from private_website_lab.support_cases where id=p_id)) or (src='public' and not exists(select 1 from private_website_lab.public_contacts where id=p_id)) then raise exception 'Enquiry not found' using errcode='P0002';end if;
  return jsonb_build_object('assignment',coalesce((select jsonb_build_object('assigned_to',a.assigned_to,'version',a.version) from private_website_lab.support_assignments a where a.source=src and a.case_id=p_id),'{"assigned_to":null,"version":0}'::jsonb),
   'owners',(select coalesce(jsonb_agg(jsonb_build_object('id',r.user_id,'name',coalesce(nullif(p.full_name,''),'Staff member')) order by p.full_name,r.user_id),'[]') from private_website_lab.member_roles r left join public.profiles p on p.id=r.user_id where private_website_lab.permitted(r.user_id,'operations')));
 elsif p_action='assign' then
  src:=p_payload->>'source';p_id:=(p_payload->>'id')::uuid;owner_id:=nullif(p_payload->>'assigned_to','')::uuid;expected:=(p_payload->>'version')::bigint;
  if src is null or src not in ('member','public') or p_id is null or expected is null or expected<0 then raise exception 'Invalid assignment';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('support:'||src||':'||p_id,0));
  if not private_website_lab.permitted(actor,'operations') then raise exception 'Operations administrator access required' using errcode='42501';end if;
  if (src='member' and not exists(select 1 from private_website_lab.support_cases where id=p_id)) or (src='public' and not exists(select 1 from private_website_lab.public_contacts where id=p_id)) then raise exception 'Enquiry not found' using errcode='P0002';end if;
  select * into current_row from private_website_lab.support_assignments where source=src and case_id=p_id for update;
  if coalesce(current_row.version,0)<>expected then raise exception 'Assignment changed. Refresh before saving.' using errcode='40001';end if;
  if owner_id is not null and not private_website_lab.permitted(owner_id,'operations') then raise exception 'Choose an available Operations or Full administrator';end if;
  insert into private_website_lab.support_assignments(source,case_id,assigned_to,changed_by) values(src,p_id,owner_id,actor)
  on conflict(source,case_id) do update set assigned_to=excluded.assigned_to,version=private_website_lab.support_assignments.version+1,changed_by=actor,changed_at=now();
  insert into private_website_lab.audit(actor_id,action,payload) values(actor,'support_assignment',jsonb_build_object('source',src,'case_id',p_id,'previous_owner',current_row.assigned_to,'assigned_to',owner_id,'version',expected+1));
  return jsonb_build_object('ok',true,'version',expected+1,'assigned_to',owner_id);
 end if;
 raise exception 'Unknown administration action';
end $$;
revoke all on function private_website_lab.admin_readiness(text,jsonb) from public,anon,authenticated;
grant execute on function private_website_lab.admin_readiness(text,jsonb) to authenticated;
create function public.website_admin_readiness(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.admin_readiness(p_action,p_payload)$$;
revoke all on function public.website_admin_readiness(text,jsonb) from public,anon,authenticated;
grant execute on function public.website_admin_readiness(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
