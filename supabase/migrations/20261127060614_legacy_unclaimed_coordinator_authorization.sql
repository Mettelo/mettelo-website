-- An imported team's coordinator can legitimately be unclaimed. NULL must
-- never bypass a negative permission check in planning, chat or recognition.
do $fix$
declare source text;
begin
 source:=pg_get_functiondef('private_website_lab.workspace(text,jsonb)'::regprocedure);
 if strpos(source,'lead:=admin or t.coordinator_id=actor;')=0 then raise exception 'Unexpected workspace authorization';end if;
 execute replace(source,'lead:=admin or t.coordinator_id=actor;','lead:=coalesce(admin or t.coordinator_id=actor,false);');
 source:=pg_get_functiondef('private_website_lab.chat(text,jsonb)'::regprocedure);
 if strpos(source,'lead:=member and t.coordinator_id=actor;')=0 then raise exception 'Unexpected chat authorization';end if;
 execute replace(source,'lead:=member and t.coordinator_id=actor;','lead:=coalesce(member and t.coordinator_id=actor,false);');
 source:=pg_get_functiondef('private_website_lab.member_home(text,jsonb)'::regprocedure);
 if strpos(source,'lead:=private_website_lab.permitted(actor,''operations'') or (t.coordinator_id=actor and tid=any(ids));')=0 then raise exception 'Unexpected contribution authorization';end if;
 execute replace(source,'lead:=private_website_lab.permitted(actor,''operations'') or (t.coordinator_id=actor and tid=any(ids));','lead:=coalesce(private_website_lab.permitted(actor,''operations'') or (t.coordinator_id=actor and tid=any(ids)),false);');
end $fix$;
