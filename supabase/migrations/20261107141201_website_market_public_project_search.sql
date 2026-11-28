begin;
do $fix$ declare src text;begin
 src:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 src:=replace(src,'p.title,p.description,p.category,p.skills::text,p.project_ref,pr.full_name,pr.username','p.title,p.description,p.category,p.skills::text,p.project_ref');
 execute src;
end $fix$;
commit;
