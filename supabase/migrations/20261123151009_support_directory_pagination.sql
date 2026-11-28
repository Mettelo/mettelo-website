create index website_support_updated_page on private_website_lab.support_cases(updated_at desc,id);
create index website_contact_updated_page on private_website_lab.public_contacts(updated_at desc,id);
create function private_website_lab.support_directory(p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $fn$
declare actor uuid:=auth.uid(); pg integer:=greatest(1,least(100000,coalesce(nullif(p_payload->>'page','')::integer,1)));
 q text:=left(btrim(coalesce(p_payload->>'q','')),150);result jsonb;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not private_website_lab.account_allowed(actor) or not private_website_lab.permitted(actor,'operations') then raise exception 'Support administrator access required' using errcode='42501';end if;
 with staff_status as materialized (
  select owner_id,private_website_lab.permitted(owner_id,'operations') available from(select distinct assigned_to owner_id from private_website_lab.support_assignments where assigned_to is not null)x
 ), base as materialized (
  select c.id,'member'::text source,c.team_id,coalesce(t.label,'General support') team_label,coalesce(t.project_ref,'General enquiry') project_ref,c.category,c.subject,c.status,coalesce(p.full_name,'Member') reporter_name,c.created_at,c.updated_at
  from private_website_lab.support_cases c left join public.website_project_teams t on t.id=c.team_id left join public.profiles p on p.id=c.reporter_id
  union all select c.id,'public',null::uuid,'Website contact','Public enquiry',c.category,c.subject,c.status,c.name,c.created_at,c.updated_at from private_website_lab.public_contacts c
 ), eligible as materialized (
  select b.*,a.assigned_to,coalesce(s.available,false) owner_available,coalesce(p.full_name,'Staff member') owner_name
  from base b left join private_website_lab.support_assignments a on a.source=b.source and a.case_id=b.id left join staff_status s on s.owner_id=a.assigned_to left join public.profiles p on p.id=a.assigned_to
  where (coalesce(p_payload->>'filter','attention')='all' or (coalesce(p_payload->>'filter','attention')='attention' and b.status in('new','in_review')) or (p_payload->>'filter'='waiting' and b.status='waiting_for_member') or (p_payload->>'filter'='done' and b.status in('resolved','closed')))
   and (coalesce(p_payload->>'source','all')='all' or b.source=p_payload->>'source')
   and (coalesce(p_payload->>'topic','all')='all' or b.category=p_payload->>'topic')
   and (coalesce(p_payload->>'case_id','')='' or b.id=nullif(p_payload->>'case_id','')::uuid)
   and (coalesce(p_payload->>'ownership','all')='all' or (p_payload->>'ownership'='unassigned' and a.assigned_to is null) or (p_payload->>'ownership'='assigned' and a.assigned_to is not null) or (p_payload->>'ownership'='unavailable' and a.assigned_to is not null and not coalesce(s.available,false)))
   and (q='' or concat_ws(' ',b.subject,b.reporter_name,b.project_ref,b.team_label,case when b.source='public' then 'WEB-'||left(b.id::text,8) else b.id::text end) ilike '%'||q||'%')
 ), paging as (select least(pg,greatest(1,ceil(count(*)/25.0)::integer)) page,count(*) total from eligible),
 page_rows as (select * from eligible order by updated_at desc,source,id limit 25 offset ((select page from paging)-1)*25)
 select jsonb_build_object('page',(select page from paging),'page_size',25,'total',(select total from paging),
  'summary',jsonb_build_object('attention',(select count(*) from base where status in('new','in_review')),'waiting',(select count(*) from base where status='waiting_for_member'),'done',(select count(*) from base where status in('resolved','closed'))),
  'topics',(select coalesce(jsonb_agg(category order by category),'[]') from(select distinct category from base)x),
  'rows',(select coalesce(jsonb_agg((to_jsonb(x)-'assigned_to'-'owner_available'-'owner_name')||jsonb_build_object('ownership',jsonb_build_object('assigned_to',assigned_to,'owner_name',owner_name,'owner_available',owner_available)) order by updated_at desc,source,id),'[]') from page_rows x)) into result;
 return result;
end $fn$;
revoke all on function private_website_lab.support_directory(jsonb) from public,anon;
grant execute on function private_website_lab.support_directory(jsonb) to authenticated;
create function public.website_support_directory(p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.support_directory(p_payload)$$;
revoke all on function public.website_support_directory(jsonb) from public,anon;
grant execute on function public.website_support_directory(jsonb) to authenticated;

