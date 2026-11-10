begin;
do $fix$ declare src text;signature text;begin
 foreach signature in array array['private_website_lab.market(text,jsonb)','private_website_lab.market_proposal(text,jsonb)'] loop
 src:=pg_get_functiondef(signature::regprocedure);
 if position('#variable_conflict use_variable' in src)=0 then raise exception 'Expected variable directive missing for %',signature;end if;
 src:=replace(src,'#variable_conflict use_variable','#variable_conflict use_column');
 execute src;
 end loop;
end $fix$;
commit;
