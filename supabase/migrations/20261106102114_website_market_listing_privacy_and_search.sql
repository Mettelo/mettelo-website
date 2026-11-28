begin;
do $fix$ declare src text;begin
 src:=pg_get_functiondef('private_website_lab.market(text,jsonb)'::regprocedure);
 src:=replace(src,$needle$where s.open and t.status='active' and t.lab_enabled$needle$,$replacement$where s.open and t.status='active' and t.lab_enabled and private_website_lab.market_leader(t.id,t.coordinator_id) and not private_website_lab.market_blocked(actor,t.coordinator_id)$replacement$);
 src:=replace(src,$needle$b.title,b.project_ref,s.roles::text,s.skills::text$needle$,$replacement$b.title,b.project_ref,s.roles::text,s.skills::text,s.description,s.commitment$replacement$);
 execute src;
end $fix$;
commit;
