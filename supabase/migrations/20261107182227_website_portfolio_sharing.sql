begin;
create schema private_portfolio_shares;
revoke all on schema private_portfolio_shares from public;
grant usage on schema private_portfolio_shares to anon,authenticated;
create table private_portfolio_shares.shares(
 id uuid primary key default gen_random_uuid(),token uuid not null unique default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),team_id uuid not null references public.website_project_teams(id),
 source_kind text not null check(source_kind in ('contribution','milestone','delivery')),source_id uuid not null,client_nonce uuid not null,
 title text not null check(length(title) between 5 and 180),summary text not null check(length(summary) between 20 and 2000),
 author_display text not null check(length(author_display) between 2 and 80),project_context text not null default '' check(length(project_context)<=180),
 skills text[] not null default '{}' check(cardinality(skills)<=8),evidence_url text,individual_part text not null default '' check(length(individual_part)<=1000),
 created_at timestamptz not null default now(),revoked_at timestamptz,feed_post_id uuid references private_website_lab.market_posts(id),unique(owner_id,client_nonce));
create index portfolio_shares_owner on private_portfolio_shares.shares(owner_id,created_at desc,id);
create index portfolio_shares_active_team on private_portfolio_shares.shares(team_id,owner_id) where revoked_at is null;
alter table private_portfolio_shares.shares enable row level security;
revoke all on private_portfolio_shares.shares from public,anon,authenticated;

create function private_portfolio_shares.source(who uuid,p_kind text,iid uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with eligible as (
 select t.id,t.status from public.website_project_teams t join public.website_project_team_members m on m.team_id=t.id where m.user_id=who and m.status='confirmed' and m.admitted_at is not null and t.lab_enabled and t.status in ('active','completed') and private_website_lab.account_allowed(who) and exists(select 1 from auth.users u where u.id=who and u.email_confirmed_at is not null)
 ), sources as (
 select i.team_id,'member-reported' review_state from private_website_lab.items i join eligible t on t.id=i.team_id where p_kind='contribution' and i.id=iid and i.kind='contribution' and i.author_id=who and i.deleted_at is null and length(btrim(i.body))>0
 union all
 select i.team_id,case when i.milestone_accepted_by is not null and i.milestone_accepted_by<>who then 'reviewed' else 'acceptance-recorded' end from private_website_lab.items i join eligible t on t.id=i.team_id join private_website_lab.items e on e.id=i.milestone_evidence_id and e.team_id=i.team_id and e.kind='contribution' and e.deleted_at is null and e.url is not null where p_kind='milestone' and i.id=iid and i.kind='milestone' and i.owner_id=who and i.status='done' and i.milestone_accepted_at is not null and i.deleted_at is null
 union all
 select d.team_id,'team-outcome' from private_website_lab.deliveries d join eligible t on t.id=d.team_id and t.status='completed' join private_website_lab.items e on e.id=d.evidence_id and e.team_id=d.team_id and e.kind='contribution' and e.deleted_at is null and e.url is not null where p_kind='delivery' and d.team_id=iid and exists(select 1 from private_website_lab.items i where i.team_id=d.team_id and i.kind='contribution' and i.author_id=who and i.deleted_at is null and length(btrim(i.body))>0)
 ) select to_jsonb(s) from sources s limit 1;
$$;
revoke all on function private_portfolio_shares.source(uuid,text,uuid) from public,anon,authenticated;
create function private_portfolio_shares.control(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();src jsonb;share private_portfolio_shares.shares;iid uuid;kind text:=payload->>'kind';nonce uuid;url text;result jsonb;origin text;pg integer:=coalesce((payload->>'page')::integer,1);
begin
 if actor is null or not private_website_lab.account_allowed(actor) or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified account access required' using errcode='42501';end if;
 if action='list' then
  if pg not between 1 and 100000 then raise exception 'Invalid page';end if;
  return jsonb_build_object('page',pg,'total',(select count(*) from private_portfolio_shares.shares where owner_id=actor),'rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id) from (select id,token,title,source_kind,created_at,revoked_at,feed_post_id from private_portfolio_shares.shares where owner_id=actor order by created_at desc,id limit 25 offset ((pg-1)*25))x),'[]'));
 elsif action='create' then
  iid:=(payload->>'source_id')::uuid;nonce:=(payload->>'client_nonce')::uuid;
  if nonce is null or payload->>'approved_public' is distinct from 'true' then raise exception 'Preview and confirm the public summary before sharing';end if;
  src:=private_portfolio_shares.source(actor,kind,iid);if src is null then raise exception 'Your source evidence is unavailable' using errcode='42501';end if;
  if length(btrim(coalesce(payload->>'title',''))) not between 5 and 180 or length(btrim(coalesce(payload->>'summary',''))) not between 20 and 2000 or length(btrim(coalesce(payload->>'author_display',''))) not between 2 and 80 or length(coalesce(payload->>'project_context',''))>180 then raise exception 'Check the public title, summary, display name and project context';end if;
  if length(coalesce(payload->>'individual_part',''))>1000 or (kind='delivery' and length(btrim(coalesce(payload->>'individual_part','')))<20) then raise exception 'Explain your individual part in the team delivery (20 to 1000 characters)';end if;
  if jsonb_typeof(payload->'skills') is distinct from 'array' or jsonb_array_length(payload->'skills')>8 or exists(select 1 from jsonb_array_elements_text(payload->'skills')s where length(btrim(s)) not between 2 and 40) then raise exception 'Choose up to eight skills, 2 to 40 characters each';end if;
  if payload->>'include_evidence'='true' then url:=nullif(btrim(payload->>'evidence_url'),'');if url is null or length(url)>1000 or url !~ '^https://[^/@[:space:]]+([/:?#]|$)' or url ~ '^https://[^/]*@' then raise exception 'Use a public HTTPS evidence link without credentials';end if;end if;
  if (select count(*) from private_portfolio_shares.shares where owner_id=actor and created_at>now()-interval '1 hour')>=10 and not exists(select 1 from private_portfolio_shares.shares where owner_id=actor and client_nonce=nonce) then raise exception 'Sharing limit reached; try again later';end if;
  insert into private_portfolio_shares.shares(owner_id,team_id,source_kind,source_id,client_nonce,title,summary,author_display,project_context,skills,evidence_url,individual_part) values(actor,(src->>'team_id')::uuid,kind,iid,nonce,btrim(payload->>'title'),btrim(payload->>'summary'),btrim(payload->>'author_display'),btrim(coalesce(payload->>'project_context','')),array(select distinct btrim(s) from jsonb_array_elements_text(payload->'skills')s),url,btrim(coalesce(payload->>'individual_part',''))) on conflict(owner_id,client_nonce) do nothing;
  select * into share from private_portfolio_shares.shares where owner_id=actor and client_nonce=nonce;
  if share.revoked_at is not null then raise exception 'That share was revoked. Start a new summary.';end if;
  return jsonb_build_object('id',share.id,'token',share.token);
 elsif action in ('feed','revoke') then
  select * into share from private_portfolio_shares.shares where id=(payload->>'id')::uuid and owner_id=actor for update;
  if share.id is null then raise exception 'Shared summary unavailable' using errcode='42501';end if;
  if action='revoke' then
   update private_portfolio_shares.shares set revoked_at=coalesce(revoked_at,now()) where id=share.id;
   update private_website_lab.market_posts set state='removed' where id=share.feed_post_id and author_id=actor;
   return jsonb_build_object('ok',true);
  end if;
  if share.revoked_at is not null or private_portfolio_shares.source(actor,share.source_kind,share.source_id) is null then raise exception 'Source access changed. This summary cannot be posted.' using errcode='42501';end if;
  origin:=payload->>'origin';if origin not in ('https://mettelo.com','https://staging.mettelo.com','http://127.0.0.1:3001') or origin is null then raise exception 'Unapproved sharing origin';end if;
  if share.feed_post_id is null then
   result:=private_website_lab.market_social('publish',jsonb_build_object('kind','showcase','body',share.title||E'\nMember-written portfolio summary: '||origin||'/proof/'||share.token||E'\n\n'||share.summary,'topics',to_jsonb(share.skills),'client_nonce',share.id));
   update private_portfolio_shares.shares set feed_post_id=(result->>'post_id')::uuid where id=share.id returning * into share;
  end if;
  return jsonb_build_object('ok',true,'post_id',share.feed_post_id);
 end if;
 raise exception 'Unsupported sharing action';
end $$;
revoke all on function private_portfolio_shares.control(text,jsonb) from public,anon;
grant execute on function private_portfolio_shares.control(text,jsonb) to authenticated;
create function public.website_portfolio_sharing(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_portfolio_shares.control(p_action,p_payload);$$;
revoke all on function public.website_portfolio_sharing(text,jsonb) from public,anon;
grant execute on function public.website_portfolio_sharing(text,jsonb) to authenticated;
create function private_portfolio_shares.read_public(share_token uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('title',s.title,'summary',s.summary,'author_display',s.author_display,'project_context',s.project_context,'skills',s.skills,'evidence_url',s.evidence_url,'individual_part',s.individual_part,'created_at',s.created_at,'kind',s.source_kind,'source_review_state',src->>'review_state')
 from private_portfolio_shares.shares s cross join lateral (select private_portfolio_shares.source(s.owner_id,s.source_kind,s.source_id) src) x where s.token=share_token and s.revoked_at is null and src is not null;
$$;
revoke all on function private_portfolio_shares.read_public(uuid) from public;
grant execute on function private_portfolio_shares.read_public(uuid) to anon,authenticated;
create function public.website_public_portfolio_share(p_token uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private_portfolio_shares.read_public(p_token);$$;
revoke all on function public.website_public_portfolio_share(uuid) from public;
grant execute on function public.website_public_portfolio_share(uuid) to anon,authenticated;
create function private_portfolio_shares.invalidate_team(tid uuid) returns void language sql security definer set search_path='' as $$
 with revoked as (update private_portfolio_shares.shares s set revoked_at=now() where s.team_id=tid and s.revoked_at is null and private_portfolio_shares.source(s.owner_id,s.source_kind,s.source_id) is null returning feed_post_id)
 update private_website_lab.market_posts set state='removed' where id in (select feed_post_id from revoked);
$$;
revoke all on function private_portfolio_shares.invalidate_team(uuid) from public,anon,authenticated;
create function private_portfolio_shares.source_change() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb;tid uuid;
begin if tg_op='DELETE' then row_data:=to_jsonb(old);else row_data:=to_jsonb(new);end if;tid:=(row_data->>case when tg_table_name='website_project_teams' then 'id' else 'team_id' end)::uuid;perform private_portfolio_shares.invalidate_team(tid);return null;end $$;
revoke all on function private_portfolio_shares.source_change() from public,anon,authenticated;
create trigger portfolio_share_membership_change after update of status,admitted_at on public.website_project_team_members for each row execute function private_portfolio_shares.source_change();
create trigger portfolio_share_membership_deleted after delete on public.website_project_team_members for each row execute function private_portfolio_shares.source_change();
create trigger portfolio_share_team_change after update of status,lab_enabled on public.website_project_teams for each row execute function private_portfolio_shares.source_change();
create trigger portfolio_share_evidence_change after update of status,deleted_at,author_id,owner_id,milestone_accepted_at,milestone_evidence_id,url,body on private_website_lab.items for each row when (old.kind in ('contribution','milestone')) execute function private_portfolio_shares.source_change();
create trigger portfolio_share_evidence_deleted after delete on private_website_lab.items for each row when (old.kind in ('contribution','milestone')) execute function private_portfolio_shares.source_change();
create trigger portfolio_share_delivery_change after update of evidence_id,confirmed_at on private_website_lab.deliveries for each row execute function private_portfolio_shares.source_change();
create trigger portfolio_share_delivery_deleted after delete on private_website_lab.deliveries for each row execute function private_portfolio_shares.source_change();
commit;
