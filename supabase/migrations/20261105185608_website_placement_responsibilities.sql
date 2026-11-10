begin;
alter table public.website_project_team_members add column responsibilities text[];
update public.website_project_team_members set responsibilities=array[role];
alter table public.website_project_team_members alter column responsibilities set not null;
alter table public.website_project_team_members add constraint member_responsibilities_nonempty check(cardinality(responsibilities)>0);

-- Internal validation only; this does not grant staff access or expose member data.
create function private_website_lab.placement_responsibilities(ref text,supplied jsonb,primary_role text,essential text[] default '{}',solo boolean default false)
returns text[] language plpgsql set search_path='' as $$
declare assigned text[];candidate text;
begin
 if supplied is null or supplied='null'::jsonb then
  assigned:=case when nullif(primary_role,'') is null then '{}'::text[] else array[primary_role] end;
 else
  if jsonb_typeof(supplied)<>'array' or exists(select 1 from jsonb_array_elements(supplied) x where jsonb_typeof(x)<>'string') then raise exception 'Choose project responsibilities';end if;
  assigned:=array(select jsonb_array_elements_text(supplied));
 end if;
 if solo then assigned:=assigned||coalesce(essential,'{}');end if;
 assigned:=array(select r from unnest(assigned) with ordinality x(r,n) group by r order by min(n));
 if cardinality(assigned)=0 then raise exception 'Assign at least one project responsibility';end if;
 foreach candidate in array assigned loop
  if candidate is null or not exists(select 1 from public.website_project_briefs b where b.project_ref=ref and b.roles ? candidate) then raise exception 'Choose responsibilities from this project';end if;
 end loop;
 return assigned;
end $$;
revoke all on function private_website_lab.placement_responsibilities(text,jsonb,text,text[],boolean) from public,anon,authenticated;

do $upgrade$
declare definition text;signature text;
begin
 -- Keep canonical primary role for compatibility, and validate the whole responsibility set.
 definition:=pg_get_functiondef('public.website_validate_pilot_member()'::regprocedure);
 if strpos(definition,'declare team public.website_project_teams;')=0 then raise exception 'Unexpected member validation';end if;
 definition:=replace(definition,E'begin\n select * into team',E'begin\n if tg_op=''UPDATE'' and new.role is distinct from old.role and new.responsibilities is not distinct from old.responsibilities then new.responsibilities:=array[new.role];end if;\n new.responsibilities:=private_website_lab.placement_responsibilities(new.project_ref,to_jsonb(new.responsibilities),new.role);\n new.role:=new.responsibilities[1];\n if tg_op=''UPDATE'' and old.status=''confirmed'' and new.status=''confirmed'' and new.responsibilities is distinct from old.responsibilities then raise exception ''Accepted responsibilities cannot be changed silently; review and re-offer the placement'' using errcode=''42501'';end if;\n select * into team');
 execute definition;

 -- A single accepted member can cover more than one required responsibility.
 foreach signature in array array['private_website_lab.readiness(uuid)','public.website_validate_pilot_team()'] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  if strpos(definition,'and role=r')=0 then raise exception 'Unexpected role readiness: %',signature;end if;
  definition:=replace(definition,'and role=r','and r=any(responsibilities)');execute definition;
 end loop;

 definition:=pg_get_functiondef('private_website_lab.admission(text,jsonb)'::regprocedure);
 if strpos(definition,'n:=jsonb_array_length(chosen);')=0 or strpos(definition,'x->>''role''=required.value')=0 then raise exception 'Unexpected formation role contract';end if;
 definition:=replace(definition,'n:=jsonb_array_length(chosen);',$normalise$n:=jsonb_array_length(chosen);
  chosen:=(select jsonb_agg(x||jsonb_build_object('role',assigned[1],'roles',to_jsonb(assigned)) order by ordinal) from jsonb_array_elements(chosen) with ordinality entry(x,ordinal) cross join lateral (select private_website_lab.placement_responsibilities(ref,x->'roles',x->>'role',array(select jsonb_array_elements_text(coalesce(p_payload->'required_roles','[]'))),a='solo') as assigned) normalised);$normalise$);
 definition:=replace(definition,'x->>''role''=required.value','(x->''roles'') ? required.value');
 definition:=replace(definition,'''interest_id'',person->>''interest_id'',''role'',person->>''role''','''interest_id'',person->>''interest_id'',''role'',person->>''role'',''responsibilities'',person->''roles''');
 execute definition;

 -- The formation path creates offers through control; legacy one-role callers still work.
 definition:=pg_get_functiondef('private_website_lab.control(text,jsonb)'::regprocedure);
 if strpos(definition,'role_name:=p_payload->>''role'';')=0 then raise exception 'Unexpected control offer contract';end if;
 definition:=replace(definition,'role_name:=p_payload->>''role'';',$normalise$p_payload:=p_payload||jsonb_build_object('responsibilities',to_jsonb(private_website_lab.placement_responsibilities(t.project_ref,p_payload->'responsibilities',p_payload->>'role',t.required_roles,t.participation='solo')));
  role_name:=p_payload->'responsibilities'->>0;$normalise$);
 definition:=replace(definition,'project_ref,role,status) values(t.id,interest.id,interest.user_id,t.project_ref,role_name,''offered'')','project_ref,role,status,responsibilities) values(t.id,interest.id,interest.user_id,t.project_ref,role_name,''offered'',array(select jsonb_array_elements_text(p_payload->''responsibilities'')))');
 execute definition;

 -- Replacement/additional offers use the existing authority, capacity and acceptance checks.
 definition:=pg_get_functiondef('private_website_lab.operations(text,jsonb)'::regprocedure);
 if strpos(definition,'project_ref,role,status,offer_expires_at) values(tid,i.id')=0 then raise exception 'Unexpected operations offer contract';end if;
 definition:=replace(definition,'if p_action=''offer'' then',$normalise$if p_action='offer' then
  p_payload:=p_payload||jsonb_build_object('responsibilities',to_jsonb(private_website_lab.placement_responsibilities(t.project_ref,p_payload->'responsibilities',p_payload->>'role',t.required_roles,t.participation='solo')));
  p_payload:=p_payload||jsonb_build_object('role',p_payload->'responsibilities'->>0);$normalise$);
 definition:=replace(definition,'project_ref,role,status,offer_expires_at) values(tid,i.id,i.user_id,t.project_ref,p_payload->>''role'',''offered'',now()+interval ''7 days'')','project_ref,role,status,offer_expires_at,responsibilities) values(tid,i.id,i.user_id,t.project_ref,p_payload->>''role'',''offered'',now()+interval ''7 days'',array(select jsonb_array_elements_text(p_payload->''responsibilities'')))');
 definition:=replace(definition,'do update set role=excluded.role,status=''offered''','do update set role=excluded.role,responsibilities=excluded.responsibilities,status=''offered''');
 definition:=replace(definition,'{"operations_version":1}','{"operations_version":1,"responsibilities_version":1}');
 execute definition;

 -- Existing displays receive the full label, plus a structured array for newer clients.
 foreach signature in array array['private_website_lab.control(text,jsonb)','private_website_lab.workspace(text,jsonb)','private_website_lab.chat(text,jsonb)','private_website_lab.member_directory_base(text,jsonb)'] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  if strpos(definition,'''role'',m.role')=0 then raise exception 'Unexpected member display: %',signature;end if;
  definition:=replace(definition,'''role'',m.role','''role'',array_to_string(m.responsibilities,'' · ''),''roles'',to_jsonb(m.responsibilities)');execute definition;
 end loop;
 definition:=pg_get_functiondef('private_website_lab.project_email_preview(integer)'::regprocedure);
 definition:=replace(definition,'m.role,m.offer_expires_at','array_to_string(m.responsibilities,'' · '') as role,m.offer_expires_at');execute definition;
 definition:=pg_get_functiondef('public.website_public_pilot_activity()'::regprocedure);
 if strpos(definition,'jsonb_agg(distinct m.role) from public.website_project_team_members m')=0 then raise exception 'Unexpected public coverage aggregate';end if;
 definition:=replace(definition,'jsonb_agg(distinct m.role) from public.website_project_team_members m','jsonb_agg(distinct responsibility) from public.website_project_team_members m cross join lateral unnest(m.responsibilities) responsibility');execute definition;
end $upgrade$;
notify pgrst,'reload schema';
commit;
