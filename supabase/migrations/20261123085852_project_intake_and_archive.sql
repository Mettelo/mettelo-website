alter table public.website_project_briefs
 add column archived_at timestamptz,
 add column publication_version bigint not null default 1 check(publication_version>0),
 add constraint archived_project_intake_closed check(archived_at is null or not intake_open);

create table private_website_content.project_status_history(
 id uuid primary key default gen_random_uuid(),project_ref text not null references public.website_project_briefs(project_ref),
 actor_id uuid not null,previous_state text not null,next_state text not null,version bigint not null,note text not null,created_at timestamptz not null default now()
);
alter table private_website_content.project_status_history enable row level security;
revoke all on private_website_content.project_status_history from public,anon,authenticated;

-- Invoked within the existing content administrator boundary. No direct client grant.
create function private_website_content.project_status(p jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid();ref text:=substring(p->>'key' from 9);desired text:=p->>'state';b public.website_project_briefs;previous text;note text:=btrim(coalesce(p->>'note',''));
begin
 if actor is null or not private_website_lab.account_allowed(actor) or not private_website_lab.permitted(actor,'operations') then raise exception 'Project administrator access required' using errcode='42501';end if;
 if p->>'key' !~ '^project:MTL-[A-Z0-9-]+$' or desired is null or desired not in ('open','closed','archived') or p->>'confirmed' is distinct from 'true' or length(note) not between 8 and 500 then raise exception 'Choose availability, confirm the change and record a reason of 8 to 500 characters';end if;
 perform pg_advisory_xact_lock(hashtextextended('website-content:'||(p->>'key'),0));
 select * into b from public.website_project_briefs where project_ref=ref for update;
 if not found then raise exception 'Project not found';end if;
 if (p->>'expected_publication_version')::bigint is distinct from b.publication_version then raise exception 'Project availability changed. Reload before updating.' using errcode='40001';end if;
 previous:=case when b.archived_at is not null then 'archived' when b.intake_open then 'open' else 'closed' end;
 if previous=desired then return jsonb_build_object('ok',true,'state',previous,'publication_version',b.publication_version,'unchanged',true);end if;
 update public.website_project_briefs set intake_open=desired='open',archived_at=case when desired='archived' then now() else null end,publication_version=publication_version+1 where project_ref=ref;
 insert into private_website_content.project_status_history(project_ref,actor_id,previous_state,next_state,version,note) values(ref,actor,previous,desired,b.publication_version+1,note);
 return jsonb_build_object('ok',true,'state',desired,'publication_version',b.publication_version+1);
end $$;
revoke all on function private_website_content.project_status(jsonb) from public,anon,authenticated;

do $adapt$
declare src text;needle text;
begin
 src:=pg_get_functiondef('private_website_content.admin(text,jsonb)'::regprocedure);
 needle:=' if not private_website_lab.permitted(actor,';
 if strpos(src,needle)=0 or strpos(src,'select b.project_ref,coalesce(d.published')=0 then raise exception 'Unexpected project library contract';end if;
 src:=replace(src,needle,E' if a=''project_status'' then return private_website_content.project_status(p);end if;\n'||needle);
 src:=replace(src,'select b.project_ref,coalesce(d.published','select b.project_ref,b.intake_open,b.archived_at,b.publication_version,coalesce(d.published');
 execute src;

 src:=pg_get_functiondef('private_project_publications.read_public(text,integer,text)'::regprocedure);
 if strpos(src,'and b.intake_open and')=0 then raise exception 'Unexpected published project filter';end if;
 src:=replace(src,'b.roles,x.published_at','b.roles,b.intake_open,x.published_at');
 src:=replace(src,'and b.intake_open and','and b.archived_at is null and');execute src;

 src:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 if strpos(src,'and s.open and t.status=')=0 or strpos(src,'and p.state=''approved'' and p.project_ref is not null')=0 then raise exception 'Unexpected unified discovery feed';end if;
 src:=replace(src,'and s.open and t.status=','and b.archived_at is null and s.open and t.status=');
 src:=replace(src,'and p.state=''approved'' and p.project_ref is not null','and p.state=''approved'' and p.project_ref is not null and not exists(select 1 from public.website_project_briefs hidden where hidden.project_ref=p.project_ref and hidden.archived_at is not null)');execute src;

 src:=pg_get_functiondef('private_website_lab.market_discovery(text,jsonb)'::regprocedure);
 needle:='join public.website_project_briefs b on b.project_ref=t.project_ref';
 if strpos(src,needle)=0 then raise exception 'Unexpected recruitment discovery contract';end if;
 src:=replace(src,needle,needle||' and b.archived_at is null');execute src;

 src:=pg_get_functiondef('private_website_lab.market_proposal(text,jsonb)'::regprocedure);
 needle:='(p_action=''approved'' and p.state=''approved'')';
 if strpos(src,needle)=0 then raise exception 'Unexpected approved project list contract';end if;
 src:=replace(src,needle,'(p_action=''approved'' and p.state=''approved'' and not exists(select 1 from public.website_project_briefs hidden where hidden.project_ref=p.project_ref and hidden.archived_at is not null))');execute src;
end $adapt$;

-- Public content includes availability so static brief templates and catalogue cards
-- observe the same state as the application policy. Published text remains public data.
create or replace function public.website_content_public(p_key text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',d.key,'data',d.published,'published_at',d.published_at)||case when d.kind='project' then jsonb_build_object('intake_open',coalesce(b.intake_open,false),'archived',b.project_ref is null or b.archived_at is not null) else '{}'::jsonb end order by d.key),'[]')
 from private_website_content.documents d left join public.website_project_briefs b on d.kind='project' and b.project_ref=substring(d.key from 9)
 where d.published is not null and (d.key=p_key or (p_key='projects' and d.kind='project'))
$$;
