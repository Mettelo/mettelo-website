begin;
do $fix$ declare src text;begin
src:=pg_get_functiondef('private_website_lab.validate_profile_history(jsonb,text)'::regprocedure);
execute replace(src,'from jsonb_each_text(item) where key<>''id'' and value<>''''','from jsonb_each_text(item) kv where kv.key<>''id'' and kv.value<>''''');
end $fix$;
commit;
