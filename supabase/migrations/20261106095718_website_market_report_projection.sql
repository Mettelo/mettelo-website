begin;
do $fix$ declare src text;begin
 src:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 src:=replace(src,$needle$select id,kind,reason,snapshot,state,created_at from private_website_lab.market_reports where state='open' order by created_at,id$needle$,$replacement$select r.id,r.kind,r.reason,r.snapshot,r.state,r.created_at from private_website_lab.market_reports r where r.state='open' order by r.created_at,r.id$replacement$);
 execute src;
end $fix$;
commit;
