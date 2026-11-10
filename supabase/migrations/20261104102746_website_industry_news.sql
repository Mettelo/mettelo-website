begin;
create schema private_website_news;
revoke all on schema private_website_news from public;
grant usage on schema private_website_news to anon,authenticated;
create table private_website_news.articles(
 id uuid primary key,slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=100),
 draft jsonb not null,published jsonb,status text not null default 'draft' check(status in ('draft','published')),
 revision integer not null default 1,first_published_at timestamptz,published_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id),updated_by uuid not null references auth.users(id),
 check(status<>'published' or (published is not null and published_at is not null))
);
create index website_news_public_date on private_website_news.articles(published_at desc,id) where status='published';
alter table private_website_news.articles enable row level security;
revoke all on private_website_news.articles from public,anon,authenticated;
create table private_website_news.audit(id bigint generated always as identity primary key,article_id uuid not null references private_website_news.articles(id),actor_id uuid not null references auth.users(id),action text not null,revision integer not null,created_at timestamptz not null default now());
alter table private_website_news.audit enable row level security;
revoke all on private_website_news.audit from public,anon,authenticated;

create function private_website_news.document(p jsonb,publishing boolean default false) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare d jsonb; k text; v text;
begin
 if jsonb_typeof(p) is distinct from 'object' then raise exception 'Article fields are required';end if;
 d:='{}';
 foreach k in array array['title','excerpt','body','author','category','format','cover_url','cover_alt','source_name','source_url'] loop
  if p ? k and jsonb_typeof(p->k)<>'string' then raise exception 'Article fields must be text';end if;
  d:=d||jsonb_build_object(k,btrim(coalesce(p->>k,'')));
 end loop;
 if length(d->>'title') not between 1 and 160 or length(d->>'excerpt')>360 or length(d->>'body')>50000 or length(d->>'author')>100 or length(d->>'cover_alt')>240 or length(d->>'source_name')>120 then raise exception 'Check the article field lengths';end if;
 if d->>'format' not in ('news','blog') or d->>'category' not in ('Data','AI & Machine Learning','Technology','Careers','Mettelo') then raise exception 'Choose an article type and topic';end if;
 foreach k in array array['cover_url','source_url'] loop
  v:=d->>k;
  if length(v)>1000 or (v<>'' and v !~ '^https://[^/@[:space:]]+([/:?][^[:space:]]*)?$') then raise exception 'Use HTTPS links without login details';end if;
 end loop;
 if d->>'cover_url'<>'' and d->>'cover_alt'='' then raise exception 'Describe the cover image for accessibility';end if;
 if publishing and (length(d->>'title')<5 or length(d->>'excerpt')<20 or length(d->>'body')<100 or length(d->>'author')<2) then raise exception 'Before publishing, add a title, summary, author and at least 100 characters of article content';end if;
 return d;
end $$;
revoke all on function private_website_news.document(jsonb,boolean) from public,anon,authenticated;

create function private_website_news.manage(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();allowed boolean;a private_website_news.articles;doc jsonb;aid uuid;v_slug text; expected integer;
begin
 allowed:=actor is not null and exists(select 1 from private_website_lab.admins x join auth.users u on u.id=x.user_id where x.user_id=actor and u.email_confirmed_at is not null);
 if p_action='access' then return jsonb_build_object('allowed',allowed);end if;
 if not allowed then raise exception 'News administrator access required' using errcode='42501';end if;
 if p_action='list' then return jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc,x.id) from (select id,slug,draft->>'title' title,draft->>'category' category,draft->>'format' format,status,revision,published_at,updated_at,(published is distinct from draft) has_draft_changes from private_website_news.articles order by updated_at desc,id limit 500) x),'[]'));end if;
 aid:=(p_payload->>'id')::uuid;
 if aid is null then raise exception 'Article reference required';end if;
 if p_action='get' then select * into a from private_website_news.articles where id=aid;if a.id is null then raise exception 'Article not found' using errcode='P0002';end if;return to_jsonb(a);end if;
 if p_action not in ('save','publish','unpublish') then raise exception 'Unsupported article action';end if;
 expected:=(p_payload->>'revision')::integer;
 if expected is null or expected<0 then raise exception 'Refresh the editor before saving';end if;
 -- Serialise a new article and retries for the same client-generated ID.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(aid::text,0));
 select * into a from private_website_news.articles where id=aid for update;
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
 return to_jsonb(a);
end $$;
revoke all on function private_website_news.manage(text,jsonb) from public,anon;
grant execute on function private_website_news.manage(text,jsonb) to authenticated;
create function public.website_news_admin(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_news.manage(p_action,p_payload)$$;
revoke all on function public.website_news_admin(text,jsonb) from public,anon;
grant execute on function public.website_news_admin(text,jsonb) to authenticated;

create function private_website_news.read_published(p_slug text default null,p_query jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;total integer;page_no integer:=greatest(1,least(1000,coalesce((p_query->>'page')::integer,1)));term text:=left(btrim(coalesce(p_query->>'q','')),120);topic text:=coalesce(p_query->>'category','');fmt text:=coalesce(p_query->>'format','');
begin
 if p_slug is not null then
  select a.published||jsonb_build_object('slug',a.slug,'published_at',a.published_at,'first_published_at',a.first_published_at) into result from private_website_news.articles a where a.slug=p_slug and a.status='published';
  return result;
 end if;
 select count(*) into total from private_website_news.articles a where a.status='published' and (topic='' or a.published->>'category'=topic) and (fmt='' or a.published->>'format'=fmt) and (term='' or position(lower(term) in lower((a.published->>'title')||' '||(a.published->>'excerpt')))>0);
 select coalesce(jsonb_agg(x.doc order by x.published_at desc,x.id),'[]') into result from (
  select a.id,a.published_at,(a.published-'body')||jsonb_build_object('slug',a.slug,'published_at',a.published_at,'reading_minutes',greatest(1,ceil(length(a.published->>'body')/1200.0)::integer)) doc
  from private_website_news.articles a where a.status='published' and (topic='' or a.published->>'category'=topic) and (fmt='' or a.published->>'format'=fmt) and (term='' or position(lower(term) in lower((a.published->>'title')||' '||(a.published->>'excerpt')))>0)
  order by a.published_at desc,a.id limit 12 offset (page_no-1)*12
 ) x;
 return jsonb_build_object('items',result,'total',total,'page',page_no);
end $$;
revoke all on function private_website_news.read_published(text,jsonb) from public;
grant execute on function private_website_news.read_published(text,jsonb) to anon,authenticated;
create function public.website_news_public(p_slug text default null,p_query jsonb default '{}') returns jsonb language sql stable security invoker set search_path='' as $$select private_website_news.read_published(p_slug,p_query)$$;
revoke all on function public.website_news_public(text,jsonb) from public;
grant execute on function public.website_news_public(text,jsonb) to anon,authenticated;
commit;
