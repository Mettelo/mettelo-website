-- Qualify the mark column: market_social also has a PL/pgSQL variable named
-- kind, and its use_variable directive made the previous DELETE match nothing.
do $fix$
declare src text:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 old_sql text:='delete from private_website_lab.market_post_marks where post_id=pid and user_id=actor and kind=p_action;';
begin
 if strpos(src,old_sql)=0 then raise exception 'Expected community mark removal branch missing; review before adapting';end if;
 execute replace(src,old_sql,'delete from private_website_lab.market_post_marks mark where mark.post_id=pid and mark.user_id=actor and mark.kind=p_action;');
end $fix$;
