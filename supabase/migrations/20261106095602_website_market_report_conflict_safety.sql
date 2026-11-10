begin;
do $fix$ declare src text;begin
 src:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 if position('on conflict(reporter_id,kind,target_id)' in src)=0 then raise exception 'Expected report insertion not found';end if;
 src:=replace(src,$needle$on conflict(reporter_id,kind,target_id) where state='open' do nothing$needle$,'on conflict do nothing');
 execute src;
end $fix$;
commit;
