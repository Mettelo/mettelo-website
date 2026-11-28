begin;
create schema private_market_shares;
revoke all on schema private_market_shares from public;
grant usage on schema private_market_shares to anon,authenticated;
create table private_market_shares.recruitment(
 team_id uuid primary key references public.website_project_teams(id),token uuid not null unique default gen_random_uuid(),
 enabled boolean not null default false,approved_by uuid not null references auth.users(id),snapshot jsonb not null,
 approved_at timestamptz not null default now()
);
alter table private_market_shares.recruitment enable row level security;
revoke all on private_market_shares.recruitment from public,anon,authenticated;
create function private_market_shares.current_public(tid uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('title',b.title,'project_ref',b.project_ref,'description',s.description,'roles',s.roles,'skills',s.skills,'commitment',s.commitment)
 from private_website_lab.market_recruitment s join public.website_project_teams t on t.id=s.team_id join public.website_project_briefs b on b.project_ref=t.project_ref
 where t.id=tid and s.open and t.status='active' and t.lab_enabled and s.collaborator_capacity>private_website_lab.market_occupied(t.id)
 and private_website_lab.market_leader(t.id,t.coordinator_id)
 and exists(select 1 from auth.users u where u.id=t.coordinator_id and u.email_confirmed_at is not null)
 and length(btrim(s.description))>=10 and cardinality(s.roles)>0 and length(btrim(s.commitment))>=3;
$$;
revoke all on function private_market_shares.current_public(uuid) from public,anon,authenticated;
create function private_market_shares.read_public(share_token uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select r.snapshot||jsonb_build_object('available',s.collaborator_capacity-private_website_lab.market_occupied(r.team_id))
 from private_market_shares.recruitment r join private_website_lab.market_recruitment s on s.team_id=r.team_id join public.website_project_teams t on t.id=r.team_id
 where r.token=share_token and r.enabled and r.approved_by=t.coordinator_id and r.snapshot=private_market_shares.current_public(r.team_id);
$$;
revoke all on function private_market_shares.read_public(uuid) from public;
grant execute on function private_market_shares.read_public(uuid) to anon,authenticated;
create function public.website_public_recruitment_share(p_token uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private_market_shares.read_public(p_token);$$;
revoke all on function public.website_public_recruitment_share(uuid) from public;
grant execute on function public.website_public_recruitment_share(uuid) to anon,authenticated;
create function private_market_shares.control(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();tid uuid:=nullif(payload->>'team_id','')::uuid;src jsonb;r private_market_shares.recruitment;
begin
 if actor is null or not private_website_lab.account_allowed(actor) or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified account access required' using errcode='42501';end if;
 if action='resolve' then
  select * into r from private_market_shares.recruitment where token=(payload->>'token')::uuid;
  if r.team_id is null or private_market_shares.read_public(r.token) is null then raise exception 'Recruitment share unavailable' using errcode='42501';end if;
  return jsonb_build_object('team_id',r.team_id);
 elsif action='link' then
  select * into r from private_market_shares.recruitment where team_id=tid;
  src:=private_market_shares.read_public(r.token);
  if src is null then return jsonb_build_object('available',false);end if;
  return jsonb_build_object('available',true,'token',r.token,'preview',src);
 end if;
 if action not in ('status','enable','disable') then raise exception 'Unsupported sharing action';end if;
 perform 1 from public.website_project_teams where id=tid for update;
 if not private_website_lab.market_leader(tid,actor) then raise exception 'Only the active Lab leader can manage public recruitment sharing' using errcode='42501';end if;
 select * into r from private_market_shares.recruitment where team_id=tid;
 if action='disable' then
  update private_market_shares.recruitment set enabled=false where team_id=tid;
  insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,'recruitment_social_disable',tid,'{}');
  return jsonb_build_object('enabled',false,'available',false);
 end if;
 src:=private_market_shares.current_public(tid);
 if action='status' then return jsonb_build_object('enabled',coalesce(r.enabled,false),'available',coalesce(private_market_shares.read_public(r.token) is not null,false),'token',r.token,'preview',src);end if;
 if payload->>'approved_public' is distinct from 'true' then raise exception 'Preview and confirm permission for this public summary';end if;
 if src is null then raise exception 'Open recruitment with approved seats and complete listing details before sharing';end if;
 insert into private_market_shares.recruitment(team_id,approved_by,snapshot,enabled) values(tid,actor,src,true)
 on conflict(team_id) do update set token=case when recruitment.enabled and recruitment.snapshot=excluded.snapshot and recruitment.approved_by=actor then recruitment.token else gen_random_uuid() end,enabled=true,approved_by=actor,snapshot=excluded.snapshot,approved_at=now() returning * into r;
 insert into private_website_lab.audit(actor_id,action,team_id,payload) values(actor,'recruitment_social_enable',tid,jsonb_build_object('public_fields',jsonb_build_array('title','project_ref','description','roles','skills','commitment')));
 return jsonb_build_object('enabled',true,'available',true,'token',r.token,'preview',private_market_shares.read_public(r.token));
end $$;
revoke all on function private_market_shares.control(text,jsonb) from public,anon;
grant execute on function private_market_shares.control(text,jsonb) to authenticated;
create function public.website_recruitment_sharing(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_market_shares.control(p_action,p_payload);$$;
revoke all on function public.website_recruitment_sharing(text,jsonb) from public,anon;
grant execute on function public.website_recruitment_sharing(text,jsonb) to authenticated;
create function private_market_shares.source_change() returns trigger language plpgsql security definer set search_path='' as $$
declare data jsonb;tid uuid;begin
 if tg_op='DELETE' then data:=to_jsonb(old);else data:=to_jsonb(new);end if;
 tid:=(data->>case when tg_table_name='website_project_teams' then 'id' else 'team_id' end)::uuid;
 update private_market_shares.recruitment r set enabled=false where r.team_id=tid and r.enabled and private_market_shares.read_public(r.token) is null;
 return null;
end $$;
revoke all on function private_market_shares.source_change() from public,anon,authenticated;
create trigger recruitment_social_listing_change after update of open,description,roles,skills,commitment,collaborator_capacity on private_website_lab.market_recruitment for each row execute function private_market_shares.source_change();
create trigger recruitment_social_team_change after update of status,lab_enabled,coordinator_id on public.website_project_teams for each row execute function private_market_shares.source_change();
create trigger recruitment_social_membership_change after update of status,admitted_at on public.website_project_team_members for each row execute function private_market_shares.source_change();
create trigger recruitment_social_membership_add after insert on public.website_project_team_members for each row execute function private_market_shares.source_change();
create trigger recruitment_social_membership_remove after delete on public.website_project_team_members for each row execute function private_market_shares.source_change();
commit;
