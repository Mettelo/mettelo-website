begin;
create schema private_project_publications;
revoke all on schema private_project_publications from public;
grant usage on schema private_project_publications to anon,authenticated;
create table private_website_lab.project_publications(nonce uuid primary key,proposal_id uuid unique references private_website_lab.market_proposals(id),published_by uuid not null references auth.users(id),published_at timestamptz);
alter table private_website_lab.project_publications enable row level security;
revoke all on private_website_lab.project_publications from public,anon,authenticated;
create function private_website_lab.publish_project(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); token uuid:=(payload->>'nonce')::uuid; pid uuid; v integer; r jsonb; ref text;
begin
 if actor is null or not private_website_lab.account_allowed(actor) or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not private_website_lab.permitted(actor,'operations') then raise exception 'Project administrator access required' using errcode='42501';end if;
 if token is null or payload->>'approved_public' is distinct from 'true' then raise exception 'Review and confirm the public brief before publishing';end if;
 if coalesce(payload->>'supporting_url','') !~ '^https://[^/@[:space:]]+/[^[:space:]]+' or payload->>'supporting_url' ~ '^https://[^/]*@' then raise exception 'Add a full HTTPS repository URL without credentials';end if;
 insert into private_website_lab.project_publications(nonce,published_by) values(token,actor) on conflict do nothing returning proposal_id into pid;
 if not found then
  select p.project_ref into ref from private_website_lab.project_publications x join private_website_lab.market_proposals p on p.id=x.proposal_id where x.nonce=token and x.published_by=actor;
  if ref is null then raise exception 'Publication identifier is unavailable';end if;
  return jsonb_build_object('project_ref',ref,'already_published',true);
 end if;
 r:=private_website_lab.market_proposal('save',payload-'proposal_id'-'version');pid:=(r->>'proposal_id')::uuid;
 select version into v from private_website_lab.market_proposals where id=pid;
 perform private_website_lab.market_proposal('submit',jsonb_build_object('proposal_id',pid,'version',v));
 select version into v from private_website_lab.market_proposals where id=pid;
 r:=private_website_lab.market_proposal('review',jsonb_build_object('proposal_id',pid,'version',v,'state','approved','roles',payload->'roles','member_capacity',coalesce((payload->>'member_capacity')::integer,4),'max_active_teams',coalesce((payload->>'max_active_teams')::integer,1),'reason','Administrator reviewed the public brief, repository, role requirements and capacity before publication.'));
 update private_website_lab.project_publications set proposal_id=pid,published_at=now() where nonce=token;
 return r;
end $$;
revoke all on function private_website_lab.publish_project(jsonb) from public,anon;
grant execute on function private_website_lab.publish_project(jsonb) to authenticated;
create function public.website_admin_publish_project(p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.publish_project(p_payload);$$;
revoke all on function public.website_admin_publish_project(jsonb) from public,anon;
grant execute on function public.website_admin_publish_project(jsonb) to authenticated;
create function private_project_publications.read_public(p_ref text default '',p_page integer default 1,p_q text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_ref is null or p_page is null or p_page not between 1 and 100000 or p_q is null or length(p_q)>150 then raise exception 'Invalid catalogue filters' using errcode='22023';end if;
 with available as materialized (
 select p.project_ref,p.title,p.problem,p.description,p.outcome,p.category,p.skills,p.participation,p.commitment,p.milestones,p.collaboration,p.supporting_url repository_url,b.roles,x.published_at
 from private_website_lab.project_publications x join private_website_lab.market_proposals p on p.id=x.proposal_id join public.website_project_briefs b on b.project_ref=p.project_ref
 where x.published_at is not null and p.state='approved' and b.intake_open and (p_ref='' or p.project_ref=p_ref)
 and (p_q='' or strpos(lower(concat_ws(' ',p.title,p.project_ref,p.description,p.category,p.skills::text)),lower(p_q))>0)
 ), counts as (select count(*)::integer total from available), paging as (select total,greatest(1,least(p_page,ceil(total/25.0)::integer)) page from counts)
 select jsonb_build_object('total',total,'page',page,'page_size',25,'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.published_at desc,r.project_ref) from (select * from available order by published_at desc,project_ref limit 25 offset ((paging.page-1)*25))r),'[]')) into result from paging;
 return result;
end $$;
revoke all on function private_project_publications.read_public(text,integer,text) from public;
grant execute on function private_project_publications.read_public(text,integer,text) to anon,authenticated;
create function public.website_project_publications(p_ref text default '',p_page integer default 1,p_q text default '') returns jsonb language sql stable security invoker set search_path='' as $$select private_project_publications.read_public(p_ref,p_page,p_q);$$;
revoke all on function public.website_project_publications(text,integer,text) from public;
grant execute on function public.website_project_publications(text,integer,text) to anon,authenticated;
commit;
