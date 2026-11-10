begin;
alter table public.website_project_team_members add column two_person_agreed_at timestamptz;
create function private_website_lab.agree_two(p_team_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); t public.website_project_teams;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 select * into t from public.website_project_teams where id=p_team_id for update;
 if t.id is null or t.status<>'forming' or t.two_person_reason is null then raise exception 'No two-person arrangement is awaiting confirmation';end if;
 update public.website_project_team_members set two_person_agreed_at=now() where team_id=p_team_id and user_id=actor and status='confirmed';
 if not found then raise exception 'A confirmed place in this team is required' using errcode='42501';end if;
 insert into private_website_lab.audit(actor_id,action,team_id) values(actor,'agree_two',p_team_id);
 return jsonb_build_object('ok',true);
end $$;
revoke all on function private_website_lab.agree_two(uuid) from public,anon;
grant execute on function private_website_lab.agree_two(uuid) to authenticated;
create or replace function public.website_lab(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if p_action='agree_two' then return private_website_lab.agree_two((p_payload->>'team_id')::uuid);end if;
 return private_website_lab.control(p_action,p_payload);
end $$;
do $upgrade$
declare source text;
begin
 source:=pg_get_functiondef('private_website_lab.control(text,jsonb)'::regprocedure);
 if strpos(source,'''access_verified'',m.access_verified_at is not null')=0 then raise exception 'Unexpected Lab collection definition';end if;
 source:=replace(source,'''access_verified'',m.access_verified_at is not null','''access_verified'',m.access_verified_at is not null,''two_person_proposed'',t.two_person_reason is not null,''two_person_agreed'',m.two_person_agreed_at is not null');
 execute source;
 source:=pg_get_functiondef('public.website_validate_pilot_team()'::regprocedure);
 if strpos(source,'if not new.lab_enabled then')=0 then raise exception 'Unexpected readiness definition';end if;
 source:=replace(source,'if not new.lab_enabled then','if filled=2 and new.participation=''team'' and exists(select 1 from public.website_project_team_members where team_id=new.id and status=''confirmed'' and two_person_agreed_at is null) then raise exception ''Both members must agree to the two-person arrangement'';end if;
 if not new.lab_enabled then');
 execute source;
end $upgrade$;
commit;
