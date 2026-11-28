begin;
do $upgrade$
declare source text;
begin
 source:=pg_get_functiondef('private_website_lab.project_admin_directory(text,jsonb)'::regprocedure);
 if strpos(source,$old$and a.review_status='new' and not a.allocated$old$)=0 then raise exception 'Unexpected project review count contract';end if;
 source:=replace(source,$old$and a.review_status='new' and not a.allocated$old$,$new$and a.review_status='new'$new$);
 execute source;
end $upgrade$;
commit;
