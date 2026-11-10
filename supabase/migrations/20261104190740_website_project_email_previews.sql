begin;
create table private_website_lab.project_email_preview_settings(id boolean primary key default true check(id),capture_enabled boolean not null default true);
insert into private_website_lab.project_email_preview_settings(id,capture_enabled) values(true,true);
create table private_website_lab.project_email_previews(
 id bigint generated always as identity primary key,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 interest_id uuid not null references public.website_project_interests(id) on delete cascade,
 team_id uuid references public.website_project_teams(id) on delete cascade,
 kind text not null check(kind in ('application_received','offer_ready','clarification','decision','lab_ready')),
 review_status text check(review_status is null or review_status in ('clarification','declined','withdrawn')),
 event_key text not null,created_at timestamptz not null default now(),
 unique(recipient_id,event_key)
);
alter table private_website_lab.project_email_preview_settings enable row level security;
alter table private_website_lab.project_email_previews enable row level security;
revoke all on private_website_lab.project_email_preview_settings,private_website_lab.project_email_previews from public,anon,authenticated;
create index project_email_preview_recipient on private_website_lab.project_email_previews(recipient_id,id);
create function private_website_lab.capture_project_email() returns trigger language plpgsql security definer set search_path='' as $$
declare member record; uid uuid; k text;
begin
 if not exists(select 1 from private_website_lab.project_email_preview_settings where id and capture_enabled) then return new;end if;
 if tg_table_name='website_project_interests' then
  insert into private_website_lab.project_email_previews(recipient_id,interest_id,kind,event_key)
  values(new.user_id,new.id,'application_received','application:'||new.id) on conflict do nothing;
 elsif tg_table_name='interest_reviews' then
  if (tg_op='INSERT' or new.status is distinct from old.status) and new.status in ('clarification','declined','withdrawn') then
   select i.user_id into uid from public.website_project_interests i where i.id=new.interest_id;
   k:=case when new.status='clarification' then 'clarification' else 'decision' end;
   insert into private_website_lab.project_email_previews(recipient_id,interest_id,kind,review_status,event_key)
   values(uid,new.interest_id,k,new.status,'review:'||new.interest_id||':'||new.status||':'||txid_current()) on conflict do nothing;
  end if;
 elsif tg_table_name='website_project_team_members' then
  if new.status='offered' and (tg_op='INSERT' or old.status is distinct from new.status) then
   insert into private_website_lab.project_email_previews(recipient_id,interest_id,team_id,kind,event_key)
   values(new.user_id,new.interest_id,new.team_id,'offer_ready','offer:'||new.team_id||':'||new.user_id||':'||txid_current()) on conflict do nothing;
  end if;
  if new.status='confirmed' and new.admitted_at is not null and new.external_access_revoked_at is null
   and (tg_op='INSERT' or old.status is distinct from new.status or old.admitted_at is null or old.external_access_revoked_at is not null)
   and exists(select 1 from public.website_project_teams t where t.id=new.team_id and t.status='active' and t.lab_enabled) then
   insert into private_website_lab.project_email_previews(recipient_id,interest_id,team_id,kind,event_key)
   values(new.user_id,new.interest_id,new.team_id,'lab_ready','lab-ready:'||new.team_id||':'||new.user_id) on conflict do nothing;
  end if;
 elsif tg_table_name='website_project_teams' then
  if new.status='active' and new.lab_enabled and (old.status is distinct from new.status or old.lab_enabled is distinct from new.lab_enabled) then
   for member in select m.user_id,m.interest_id from public.website_project_team_members m where m.team_id=new.id and m.status='confirmed' and m.admitted_at is not null and m.external_access_revoked_at is null loop
    insert into private_website_lab.project_email_previews(recipient_id,interest_id,team_id,kind,event_key)
    values(member.user_id,member.interest_id,new.id,'lab_ready','lab-ready:'||new.id||':'||member.user_id) on conflict do nothing;
   end loop;
  end if;
 end if;
 return new;
end $$;
revoke all on function private_website_lab.capture_project_email() from public,anon,authenticated;
create trigger project_email_application after insert on public.website_project_interests for each row execute function private_website_lab.capture_project_email();
create trigger project_email_review after insert or update on private_website_lab.interest_reviews for each row execute function private_website_lab.capture_project_email();
create trigger project_email_placement after insert or update on public.website_project_team_members for each row execute function private_website_lab.capture_project_email();
create trigger project_email_team after update on public.website_project_teams for each row execute function private_website_lab.capture_project_email();

create function private_website_lab.project_email_preview(p_limit integer default 100) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from (
 select q.id::text,q.kind,q.event_key,q.recipient_id,u.email,i.project_ref,b.title project_title,t.label team_label,q.team_id,q.review_status,m.role,m.offer_expires_at,q.created_at
 from private_website_lab.project_email_previews q
 join public.website_project_interests i on i.id=q.interest_id and i.user_id=q.recipient_id
 join public.website_project_briefs b on b.project_ref=i.project_ref
 join auth.users u on u.id=q.recipient_id
 left join public.website_project_teams t on t.id=q.team_id
 left join public.website_project_team_members m on m.team_id=q.team_id and m.user_id=q.recipient_id and m.interest_id=q.interest_id
 left join private_website_lab.interest_reviews r on r.interest_id=q.interest_id
 where u.email_confirmed_at is not null and u.email is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
 and (
  q.kind='application_received'
  or (q.kind in ('clarification','decision') and r.status=q.review_status and not exists(select 1 from private_website_lab.project_email_previews newer where newer.interest_id=q.interest_id and newer.kind in ('clarification','decision') and newer.id>q.id))
  or (q.kind='offer_ready' and m.status='offered' and t.status in ('forming','active') and m.offer_expires_at>now() and not exists(select 1 from private_website_lab.project_email_previews newer where newer.team_id=q.team_id and newer.recipient_id=q.recipient_id and newer.kind='offer_ready' and newer.id>q.id))
  or (q.kind='lab_ready' and t.status='active' and t.lab_enabled and m.status='confirmed' and m.admitted_at is not null and m.external_access_revoked_at is null)
 ) order by q.id limit least(200,greatest(1,coalesce(p_limit,100)))
 ) x
$$;
revoke all on function private_website_lab.project_email_preview(integer) from public,anon,authenticated;
grant execute on function private_website_lab.project_email_preview(integer) to service_role;
create function public.website_project_email_previews(p_limit integer default 100) returns jsonb language sql stable security invoker set search_path='' as $$select private_website_lab.project_email_preview(p_limit)$$;
revoke all on function public.website_project_email_previews(integer) from public,anon,authenticated;
grant execute on function public.website_project_email_previews(integer) to service_role;
comment on table private_website_lab.project_email_previews is 'Preview-only project email events. No provider delivery or schedule. Existing records are not backfilled.';
commit;
