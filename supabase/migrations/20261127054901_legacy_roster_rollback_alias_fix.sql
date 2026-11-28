do $fix$
declare source text;
begin
 source:=pg_get_functiondef('private_legacy_roster.remove_rehearsal(text)'::regprocedure);
 if strpos(source,'using private_legacy_roster.groups g where g.batch_key=p_key and p.team_id=g.team_id')=0 then raise exception 'Unexpected rollback source';end if;
 source:=replace(source,'using private_legacy_roster.groups g where g.batch_key=p_key and p.team_id=g.team_id','using private_legacy_roster.groups source_group where source_group.batch_key=p_key and p.team_id=source_group.team_id');
 execute source;
end $fix$;
