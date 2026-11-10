begin;
create table private_website_lab.public_contacts (
 id uuid primary key default gen_random_uuid(), nonce uuid not null unique,
 name text not null check(length(name) between 2 and 120),email text not null check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 category text not null check(category in ('general','membership','projects','workshops','partnership','community','privacy','website')),
 subject text not null check(length(subject) between 5 and 180),message text not null check(length(message) between 20 and 5000),
 consent_at timestamptz not null default now(),status text not null default 'new' check(status in ('new','in_review','waiting_for_member','resolved','closed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index website_public_contact_queue on private_website_lab.public_contacts(created_at desc);
create index website_public_contact_rate on private_website_lab.public_contacts(email,created_at desc);
create table private_website_lab.public_contact_notes(id uuid primary key default gen_random_uuid(),contact_id uuid not null references private_website_lab.public_contacts(id),author_id uuid not null references auth.users(id),body text not null check(length(body) between 1 and 5000),created_at timestamptz not null default now());
create index website_public_contact_notes on private_website_lab.public_contact_notes(contact_id,created_at);
alter table private_website_lab.public_contacts enable row level security;
alter table private_website_lab.public_contact_notes enable row level security;
revoke all on private_website_lab.public_contacts,private_website_lab.public_contact_notes from public,anon,authenticated;

create function private_website_lab.contact_submit(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid; existing private_website_lab.public_contacts; email_value text:=lower(btrim(p_payload->>'email')); token uuid:=(p_payload->>'nonce')::uuid;
begin
 if p_payload->>'consent' is distinct from 'true' or token is null or email_value is null or p_payload->>'name' is null or p_payload->>'subject' is null or p_payload->>'message' is null or p_payload->>'category' is null then raise exception 'Valid enquiry details and consent required' using errcode='22023';end if;
 -- One bounded write-only entry point. Lock the rate window across concurrent requests.
 perform pg_advisory_xact_lock(741002);
 select * into existing from private_website_lab.public_contacts where nonce=token;
 if found then
  if existing.email<>email_value or existing.name<>btrim(p_payload->>'name') or existing.subject<>btrim(p_payload->>'subject') or existing.message<>btrim(p_payload->>'message') or existing.category<>p_payload->>'category' then raise exception 'Reload before sending a different enquiry' using errcode='22023';end if;
  return jsonb_build_object('reference','WEB-'||upper(substr(existing.id::text,1,8)));
 end if;
 if (select count(*) from private_website_lab.public_contacts where created_at>now()-interval '1 hour' and email=email_value)>=3 or (select count(*) from private_website_lab.public_contacts where created_at>now()-interval '1 hour')>=60 then raise exception 'Contact rate limit reached';end if;
 insert into private_website_lab.public_contacts(nonce,name,email,category,subject,message) values(token,btrim(p_payload->>'name'),email_value,p_payload->>'category',btrim(p_payload->>'subject'),btrim(p_payload->>'message')) returning id into cid;
 return jsonb_build_object('reference','WEB-'||upper(substr(cid::text,1,8)));
end $$;
revoke all on function private_website_lab.contact_submit(jsonb) from public;
grant execute on function private_website_lab.contact_submit(jsonb) to anon,authenticated;
grant usage on schema private_website_lab to anon;
create function public.website_contact_submit(p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.contact_submit(p_payload)$$;
revoke all on function public.website_contact_submit(jsonb) from public;
grant execute on function public.website_contact_submit(jsonb) to anon,authenticated;

create function private_website_lab.contact_admin(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); cid uuid:=nullif(p_payload->>'id','')::uuid;c private_website_lab.public_contacts;
begin
 if actor is null or not exists(select 1 from private_website_lab.admins a join auth.users u on u.id=a.user_id where a.user_id=actor and u.email_confirmed_at is not null) then raise exception 'Support administrator required' using errcode='42501';end if;
 if p_action='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'source','public','category',x.category,'subject',x.subject,'status',x.status,'reporter_name',x.name,'created_at',x.created_at,'updated_at',x.updated_at,'team_id','','team_label','Website contact','project_ref','Public enquiry') order by x.updated_at desc) from private_website_lab.public_contacts x),'[]');end if;
 select * into c from private_website_lab.public_contacts where id=cid for update;
 if c.id is null then raise exception 'Contact enquiry not found' using errcode='22023';end if;
 if p_action='case' then return jsonb_build_object('case',to_jsonb(c)-'nonce','notes',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'body',n.body,'created_at',n.created_at,'author',coalesce(p.full_name,'Mettelo support')) order by n.created_at) from private_website_lab.public_contact_notes n left join public.profiles p on p.id=n.author_id where contact_id=cid),'[]'));end if;
 if p_action='update' then update private_website_lab.public_contacts set status=p_payload->>'status',updated_at=now() where id=cid;
 elsif p_action='note' then insert into private_website_lab.public_contact_notes(contact_id,author_id,body) values(cid,actor,btrim(p_payload->>'body'));update private_website_lab.public_contacts set updated_at=now() where id=cid;
 else raise exception 'Unsupported support action' using errcode='22023';end if;
 insert into private_website_lab.audit(actor_id,action,payload) values(actor,'public_contact_'||p_action,jsonb_build_object('contact_id',cid));
 return '{"ok":true}';
end $$;
revoke all on function private_website_lab.contact_admin(text,jsonb) from public,anon;
grant execute on function private_website_lab.contact_admin(text,jsonb) to authenticated;
create function public.website_contact_admin(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.contact_admin(p_action,p_payload)$$;
revoke all on function public.website_contact_admin(text,jsonb) from public,anon;
grant execute on function public.website_contact_admin(text,jsonb) to authenticated;
commit;
