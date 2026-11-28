begin;
-- Private, read-only projection. No sharing state or new achievement records.
create index website_portfolio_contribution_author on private_website_lab.items(author_id,team_id,created_at desc,id desc) where kind='contribution' and deleted_at is null;
create index website_portfolio_milestone_owner on private_website_lab.items(owner_id,team_id,milestone_accepted_at desc,id desc) where kind='milestone' and deleted_at is null and milestone_accepted_at is not null;
create function private_website_lab.member_portfolio(p_kind text default 'all',p_q text default '',p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not private_website_lab.account_allowed(actor) then raise exception 'Verified account access required' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('all','contribution','milestone','delivery') or p_q is null or length(p_q)>150 or p_page is null or p_page not between 1 and 1000000 then raise exception 'Invalid portfolio filters' using errcode='22023';end if;
 with eligible as materialized (
  select t.id,t.project_ref,t.label,t.status,coalesce(b.title,t.project_ref) project_title,m.role,m.responsibilities
  from public.website_project_team_members m join public.website_project_teams t on t.id=m.team_id
  left join public.website_project_briefs b on b.project_ref=t.project_ref
  where m.user_id=actor and m.status='confirmed' and m.admitted_at is not null and t.lab_enabled and t.status in ('active','completed')
 ), own as materialized (
  select i.* from private_website_lab.items i join eligible t on t.id=i.team_id
  where i.author_id=actor and i.kind='contribution' and i.deleted_at is null and length(btrim(i.body))>0
 ), records as materialized (
  select i.id,'contribution'::text kind,i.team_id,i.title,i.body,i.collaboration,i.url,i.created_at recorded_at,
   'member-reported'::text review_state,null::text review_note from own i
  union all
  select i.id,'milestone',i.team_id,i.title,i.body,''::text,e.url,i.milestone_accepted_at,
   case when i.milestone_accepted_by is not null and i.milestone_accepted_by<>actor then 'reviewed' else 'acceptance-recorded' end,i.milestone_review_note
  from private_website_lab.items i join eligible t on t.id=i.team_id
  join private_website_lab.items e on e.id=i.milestone_evidence_id and e.team_id=i.team_id and e.kind='contribution' and e.deleted_at is null and e.url is not null
  where i.kind='milestone' and i.owner_id=actor and i.status='done' and i.deleted_at is null and i.milestone_accepted_at is not null
  union all
  select d.team_id,'delivery',d.team_id,'Project delivery',d.note,''::text,e.url,d.confirmed_at,'team-outcome',null::text
  from private_website_lab.deliveries d join eligible t on t.id=d.team_id and t.status='completed'
  join private_website_lab.items e on e.id=d.evidence_id and e.team_id=d.team_id and e.kind='contribution' and e.deleted_at is null and e.url is not null
  where exists(select 1 from own i where i.team_id=d.team_id)
 ), enriched as materialized (
  select r.*,t.project_ref,t.project_title,t.label team_label,t.status team_status,t.role,
   coalesce(nullif(t.responsibilities,'{}'::text[]),array[t.role]) responsibilities,
   coalesce((select jsonb_agg(s.skill order by s.skill) from private_website_lab.work_skills s where s.item_id=r.id and r.kind='contribution'),'[]') skills
  from records r join eligible t on t.id=r.team_id
 ), filtered as materialized (
  select * from enriched r where (p_kind='all' or r.kind=p_kind) and (btrim(p_q)='' or strpos(lower(concat_ws(' ',r.title,r.project_title,r.project_ref,r.team_label,r.role)),lower(btrim(p_q)))>0)
 ), totals as (select count(*)::integer total from filtered), paging as (
  select total,greatest(1,least(p_page,ceil(total/25.0)::integer)) page from totals
 ), skill_list as materialized (select distinct s.skill from private_website_lab.work_skills s join own i on i.id=s.item_id)
 select jsonb_build_object(
  'summary',jsonb_build_object('contributions',(select count(*) from own),'milestones',(select count(*) from records where kind='milestone'),'deliveries',(select count(distinct project_ref) from enriched where kind='delivery'),'skills',(select count(*) from skill_list)),
  'skills',coalesce((select jsonb_agg(skill order by skill) from (select skill from skill_list order by skill limit 50) s),'[]'),
  'page',page,'page_size',25,'total',total,
  'rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.recorded_at desc,x.kind,x.id desc) from (select * from filtered order by recorded_at desc,kind,id desc limit 25 offset ((paging.page-1)*25)) x),'[]')
 ) into result from paging;
 return result;
end $$;
revoke all on function private_website_lab.member_portfolio(text,text,integer) from public,anon;
grant execute on function private_website_lab.member_portfolio(text,text,integer) to authenticated;
create function public.website_member_portfolio(p_kind text default 'all',p_q text default '',p_page integer default 1)
returns jsonb language sql stable security invoker set search_path='' as $$select private_website_lab.member_portfolio(p_kind,p_q,p_page);$$;
revoke all on function public.website_member_portfolio(text,text,integer) from public,anon;
grant execute on function public.website_member_portfolio(text,text,integer) to authenticated;
commit;
