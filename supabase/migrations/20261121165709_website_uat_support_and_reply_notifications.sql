begin;

-- Preserve the existing authorization, row locks and notification preferences.
-- A reporter asking for more help must return to the active support queue.
do $fix$
declare definition text; before_text text; after_text text;
begin
 definition:=pg_get_functiondef('private_website_lab.operations_before_ready_activation(text,jsonb)'::regprocedure);
 before_text:=$before$c.reporter_id=actor and c.status='waiting_for_member' and coalesce(p_payload->>'internal','false')<>'true'$before$;
 after_text:=$after$c.reporter_id=actor and c.status in ('waiting_for_member','resolved') and coalesce(p_payload->>'internal','false')<>'true'$after$;
 if strpos(definition,before_text)=0 then raise exception 'Unexpected support follow-up definition';end if;
 execute replace(definition,before_text,after_text);

 -- Other members' comments still notify the author; authors' own comments do not.
 definition:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 before_text:=$before$perform private_website_lab.notify_member((select author_id from private_website_lab.market_posts where id=pid),'market-comment:'||comment_id$before$;
 after_text:=$after$perform private_website_lab.notify_member((select author_id from private_website_lab.market_posts where id=pid and author_id<>actor),'market-comment:'||comment_id$after$;
 if strpos(definition,before_text)=0 then raise exception 'Unexpected community reply notification definition';end if;
 execute replace(definition,before_text,after_text);
end $fix$;

commit;
