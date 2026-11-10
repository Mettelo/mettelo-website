begin;
create table private_website_lab.member_roles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('member','writer','editor','operations_admin','full_admin')),
 version bigint not null default 1,changed_by uuid references auth.users(id),changed_at timestamptz not null default now());
create table private_website_lab.member_role_audit(
 id bigint generated always as identity primary key,user_id uuid not null references auth.users(id),actor_id uuid not null references auth.users(id),
 previous_role text not null,new_role text not null,reason text not null check(length(btrim(reason)) between 8 and 500),created_at timestamptz not null default now());
create index member_role_audit_user on private_website_lab.member_role_audit(user_id,created_at desc,id desc);
alter table private_website_lab.member_roles enable row level security;
alter table private_website_lab.member_role_audit enable row level security;
revoke all on private_website_lab.member_roles,private_website_lab.member_role_audit from public,anon,authenticated;
-- Preserve the approved legacy administrators, without assigning anyone new.
insert into private_website_lab.member_roles(user_id,role) select user_id,'full_admin' from private_website_lab.admins;
do $$begin
 if exists(select 1 from private_opportunity_pipeline.admins a where not exists(select 1 from private_website_lab.member_roles r where r.user_id=a.user_id)) then raise exception 'Review unmapped legacy opportunity administrators before upgrading';end if;
 if not exists(select 1 from private_website_lab.member_roles r join auth.users u on u.id=r.user_id where r.role='full_admin' and u.email_confirmed_at is not null and private_website_lab.account_allowed(u.id)) then raise exception 'An available Full admin is required';end if;
end $$;
create function private_website_lab.assigned_role(uid uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select role from private_website_lab.member_roles where user_id=uid),'member')
$$;
create function private_website_lab.permitted(uid uuid,capability text) returns boolean language sql stable security definer set search_path='' as $$
 select uid is not null and private_website_lab.account_allowed(uid)
 and exists(select 1 from auth.users where id=uid and email_confirmed_at is not null)
 and case capability
  when 'roles' then private_website_lab.assigned_role(uid)='full_admin'
  when 'operations' then private_website_lab.assigned_role(uid) in ('full_admin','operations_admin')
  when 'news' then private_website_lab.assigned_role(uid) in ('full_admin','editor','writer')
  when 'publish' then private_website_lab.assigned_role(uid) in ('full_admin','editor')
  when 'opportunities' then private_website_lab.assigned_role(uid)='full_admin'
  else false end
$$;
revoke all on function private_website_lab.assigned_role(uuid),private_website_lab.permitted(uuid,text) from public,anon,authenticated;
create function private_website_lab.admin_capabilities() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('role',private_website_lab.assigned_role(auth.uid()),
 'operations',private_website_lab.permitted(auth.uid(),'operations'),'news',private_website_lab.permitted(auth.uid(),'news'),
 'publish',private_website_lab.permitted(auth.uid(),'publish'),'roles',private_website_lab.permitted(auth.uid(),'roles'),
 'opportunities',private_website_lab.permitted(auth.uid(),'opportunities'))
$$;
revoke all on function private_website_lab.admin_capabilities() from public,anon,authenticated;
grant execute on function private_website_lab.admin_capabilities() to authenticated;
create function public.website_admin_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$select private_website_lab.admin_capabilities()$$;
revoke all on function public.website_admin_capabilities() from public,anon,authenticated;
grant execute on function public.website_admin_capabilities() to authenticated;

-- Replace every legacy authority lookup, including delegated Lab/workspace paths.
-- Assertions fail the migration if an earlier definition has changed unexpectedly.
do $upgrade$
declare signature text; body text; before_text text; after_text text;
begin
 foreach signature in array array['private_website_lab.control(text,jsonb)','private_website_lab.admission(text,jsonb)','private_website_lab.workspace(text,jsonb)','private_website_lab.chat(text,jsonb)','private_website_lab.operations(text,jsonb)','private_website_lab.member_home(text,jsonb)'] loop
  body:=pg_get_functiondef(signature::regprocedure);
  before_text:='exists(select 1 from private_website_lab.admins where user_id=actor)';
  if strpos(body,before_text)=0 then raise exception 'Unexpected legacy authority in %',signature;end if;
  body:=replace(body,before_text,$r$private_website_lab.permitted(actor,'operations')$r$);execute body;
 end loop;
 body:=pg_get_functiondef('private_website_lab.contact_admin(text,jsonb)'::regprocedure);
 before_text:='exists(select 1 from private_website_lab.admins a join auth.users u on u.id=a.user_id where a.user_id=actor and u.email_confirmed_at is not null)';
 if strpos(body,before_text)=0 then raise exception 'Unexpected contact authority';end if;
 execute replace(body,before_text,$r$private_website_lab.permitted(actor,'operations')$r$);
 body:=pg_get_functiondef('private_opportunity_pipeline.admin_control(text,jsonb)'::regprocedure);
 before_text:='exists(select 1 from private_opportunity_pipeline.admins a join auth.users u on u.id=a.user_id where a.user_id=actor and u.email_confirmed_at is not null)';
 if strpos(body,before_text)=0 then raise exception 'Unexpected opportunity authority';end if;
 execute replace(body,before_text,$r$private_website_lab.permitted(actor,'opportunities')$r$);
 body:=pg_get_functiondef('private_opportunity_pipeline.scan_control(text,jsonb)'::regprocedure);
 before_text:=E'exists(\n  select 1 from private_opportunity_pipeline.admins a join auth.users u on u.id=a.user_id\n  where a.user_id=actor and u.email_confirmed_at is not null\n )';
 if strpos(body,before_text)=0 then raise exception 'Unexpected scan authority';end if;
 execute replace(body,before_text,$r$private_website_lab.permitted(actor,'opportunities')$r$);
 body:=pg_get_functiondef('private_website_lab.manage_members(text,jsonb)'::regprocedure);
 before_text:='exists(select 1 from private_website_lab.admins where user_id=actor)';
 if strpos(body,before_text)=0 then raise exception 'Unexpected member authority';end if;
 body:=replace(body,before_text,$r$private_website_lab.permitted(actor,'operations')$r$);
 foreach signature in array array['u.id','target'] loop
  before_text:='exists(select 1 from private_website_lab.admins where user_id='||signature||') or exists(select 1 from private_opportunity_pipeline.admins where user_id='||signature||')';
  if strpos(body,before_text)=0 then raise exception 'Unexpected protected-member authority';end if;
  body:=replace(body,before_text,'private_website_lab.assigned_role('||signature||')<>''member''');
 end loop;
 execute body;
end $upgrade$;

alter function private_website_lab.manage_members(text,jsonb) rename to member_directory_base;
revoke all on function private_website_lab.member_directory_base(text,jsonb) from public,anon,authenticated;
create function private_website_lab.manage_members(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();target uuid;result jsonb;new_role text;old_role text;expected bigint;current_version bigint;target_email text;why text;
begin
 if not private_website_lab.permitted(actor,'operations') then raise exception 'Member administrator access required' using errcode='42501';end if;
 if p_action='set_role' then
  -- One lock serialises all grants/demotions and the last-admin decision.
  perform pg_advisory_xact_lock(hashtextextended('mettelo.admin.roles',0));
  if not private_website_lab.permitted(actor,'roles') then raise exception 'Only a Full admin can change roles' using errcode='42501';end if;
  target:=(p_payload->>'user_id')::uuid;new_role:=p_payload->>'role';
  if new_role is null or new_role not in ('member','writer','editor','operations_admin','full_admin') then raise exception 'Choose a supported role';end if;
  select email into target_email from auth.users where id=target and deleted_at is null for update;
  if not found then raise exception 'Member not found';end if;
  select role,version into old_role,current_version from private_website_lab.member_roles where user_id=target;
  old_role:=coalesce(old_role,'member');current_version:=coalesce(current_version,0);expected:=(p_payload->>'role_version')::bigint;
  if expected is null or expected<>current_version then raise exception 'Member role changed. Refresh before continuing';end if;
  why:=btrim(coalesce(p_payload->>'reason',''));
  if length(why) not between 8 and 500 then raise exception 'Record a reason between 8 and 500 characters';end if;
  if lower(btrim(coalesce(p_payload->>'confirmation',''))) is distinct from lower(target_email) then raise exception 'Type the member email to confirm';end if;
  if new_role<>'member' and not exists(select 1 from auth.users where id=target and email_confirmed_at is not null and private_website_lab.account_allowed(target)) then raise exception 'Verify and restore this account before assigning an administrative role';end if;
  if old_role=new_role then return jsonb_build_object('ok',true,'unchanged',true);end if;
  if old_role='full_admin' and new_role<>'full_admin' and not exists(select 1 from private_website_lab.member_roles r where r.user_id<>target and r.role='full_admin' and private_website_lab.permitted(r.user_id,'roles')) then raise exception 'Keep at least one available Full admin';end if;
  insert into private_website_lab.member_roles(user_id,role,changed_by) values(target,new_role,actor)
   on conflict(user_id) do update set role=excluded.role,version=private_website_lab.member_roles.version+1,changed_by=actor,changed_at=now();
  insert into private_website_lab.member_role_audit(user_id,actor_id,previous_role,new_role,reason) values(target,actor,old_role,new_role,why);
  return jsonb_build_object('ok',true,'self_changed',actor=target);
 end if;
 result:=private_website_lab.member_directory_base(p_action,p_payload);
 if p_action='list' then
  select result||jsonb_build_object('can_manage_roles',private_website_lab.permitted(actor,'roles'),'members',coalesce(jsonb_agg(m||jsonb_build_object('role',private_website_lab.assigned_role((m->>'id')::uuid)) order by ord),'[]')) into result from jsonb_array_elements(result->'members') with ordinality x(m,ord);
 elsif p_action='detail' then
  target:=(p_payload->>'user_id')::uuid;
  result:=result||jsonb_build_object('role',private_website_lab.assigned_role(target),'role_version',coalesce((select version from private_website_lab.member_roles where user_id=target),0),'can_manage_roles',private_website_lab.permitted(actor,'roles'),
   'role_audit',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from (select h.id,h.actor_id,coalesce((select full_name from public.profiles p where p.id=h.actor_id),'Administrator') actor_name,h.previous_role,h.new_role,h.reason,h.created_at from private_website_lab.member_role_audit h where h.user_id=target order by h.created_at desc,h.id desc limit 10)x),'[]'));
 end if;
 return result;
end $$;
revoke all on function private_website_lab.manage_members(text,jsonb) from public,anon,authenticated;
grant execute on function private_website_lab.manage_members(text,jsonb) to authenticated;
-- Recreate the API wrapper so it binds to the new authority, not the renamed implementation.
create or replace function public.website_manage_members(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.manage_members(p_action,p_payload)$$;
create or replace function private_website_news.manage(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();allowed boolean;a private_website_news.articles;doc jsonb;aid uuid;v_slug text; expected integer;
begin
 allowed:=private_website_lab.permitted(actor,'news');
 if p_action='access' then return jsonb_build_object('allowed',allowed,'can_publish',private_website_lab.permitted(actor,'publish'));end if;
 if not allowed then raise exception 'News administrator access required' using errcode='42501';end if;
 if p_action='list' then return jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc,x.id) from (select id,slug,draft->>'title' title,draft->>'category' category,draft->>'format' format,status,revision,published_at,updated_at,(published is distinct from draft) has_draft_changes from private_website_news.articles where private_website_lab.permitted(actor,'publish') or (created_by=actor and status='draft' and first_published_at is null) order by updated_at desc,id limit 500) x),'[]'));end if;
 aid:=(p_payload->>'id')::uuid;
 if aid is null then raise exception 'Article reference required';end if;
 if p_action='get' then select * into a from private_website_news.articles where id=aid and (private_website_lab.permitted(actor,'publish') or (created_by=actor and status='draft' and first_published_at is null));if a.id is null then raise exception 'Article not found' using errcode='P0002';end if;return to_jsonb(a)||jsonb_build_object('can_publish',private_website_lab.permitted(actor,'publish'));end if;
 if p_action not in ('save','publish','unpublish') then raise exception 'Unsupported article action';end if;
 if p_action in ('publish','unpublish') and not private_website_lab.permitted(actor,'publish') then raise exception 'An Editor or Full admin must publish articles' using errcode='42501';end if;
 expected:=(p_payload->>'revision')::integer;
 if expected is null or expected<0 then raise exception 'Refresh the editor before saving';end if;
 -- Serialise a new article and retries for the same client-generated ID.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(aid::text,0));
 select * into a from private_website_news.articles where id=aid for update;
 if a.id is not null and not private_website_lab.permitted(actor,'publish') and (a.created_by<>actor or a.status<>'draft' or a.first_published_at is not null) then raise exception 'Writers can edit only their own unpublished drafts' using errcode='42501';end if;
 if a.id is null and (p_action<>'save' or expected<>0) then raise exception 'Article not found' using errcode='P0002';end if;
 if a.id is not null and a.revision<>expected then raise exception 'This article changed in another editor. Reload before saving.' using errcode='40001';end if;
 if p_action='save' then
  doc:=private_website_news.document(p_payload->'document',false);v_slug:=p_payload->>'slug';
  if v_slug is null or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_slug)>100 then raise exception 'Use a URL slug containing lowercase letters, numbers and hyphens';end if;
  if a.first_published_at is not null and v_slug<>a.slug then raise exception 'The URL cannot change after first publication';end if;
  if a.id is null then
   insert into private_website_news.articles(id,slug,draft,created_by,updated_by) values(aid,v_slug,doc,actor,actor) returning * into a;
  else
   update private_website_news.articles set slug=v_slug,draft=doc,revision=revision+1,updated_at=now(),updated_by=actor where id=aid returning * into a;
  end if;
 elsif p_action='publish' then
  doc:=private_website_news.document(a.draft,true);
  update private_website_news.articles set published=doc,status='published',first_published_at=coalesce(first_published_at,now()),published_at=now(),updated_at=now(),updated_by=actor,revision=revision+1 where id=aid returning * into a;
 else
  if a.status<>'published' then raise exception 'This article is already unpublished';end if;
  update private_website_news.articles set status='draft',updated_at=now(),updated_by=actor,revision=revision+1 where id=aid returning * into a;
 end if;
 insert into private_website_news.audit(article_id,actor_id,action,revision) values(aid,actor,p_action,a.revision);
 return to_jsonb(a)||jsonb_build_object('can_publish',private_website_lab.permitted(actor,'publish'));
end $$;

notify pgrst,'reload schema';
commit;
