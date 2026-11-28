begin;
do $upgrade$
declare source text;
begin
 source:=pg_get_functiondef('private_website_lab.chat(text,jsonb)'::regprocedure);
 if strpos(source,'''mentioned_user_ids'',x.mentioned_user_ids')=0 then raise exception 'Unexpected Chat projection';end if;
 source:=replace(source,'''mentioned_user_ids'',x.mentioned_user_ids','''client_nonce'',x.client_nonce,''mentioned_user_ids'',x.mentioned_user_ids');
 source:=replace(source,'''mentioned_user_ids'',msg.mentioned_user_ids','''client_nonce'',msg.client_nonce,''mentioned_user_ids'',msg.mentioned_user_ids');
 execute source;
 source:=pg_get_functiondef('public.website_validate_pilot_team()'::regprocedure);
 if strpos(source,'if not new.lab_enabled then')=0 then raise exception 'Unexpected team readiness definition';end if;
 source:=replace(source,'if not new.lab_enabled then raise exception ''Lab transfer is not ready for this team'';end if;',
 'if not new.lab_enabled then raise exception ''Lab transfer is not ready for this team'';end if;
  if not exists(select 1 from private_website_lab.items where team_id=new.id and kind=''milestone'') or exists(select 1 from private_website_lab.items i where i.team_id=new.id and i.kind=''milestone'' and not exists(select 1 from public.website_project_team_members m where m.team_id=new.id and m.user_id=i.owner_id and m.status=''confirmed'')) then raise exception ''Assign a team member to each milestone before starting'';end if;');
 execute source;
end $upgrade$;
commit;
