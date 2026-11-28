begin;
do $adapt$
declare src text;needle text:='skills,s.contactable from public.profiles p';
begin
 src:=pg_get_functiondef('private_website_lab.market(text,jsonb)'::regprocedure);
 if strpos(src,needle)=0 then raise exception 'People projection changed';end if;
 execute replace(src,needle,'skills,s.contactable,exists(select 1 from private_website_lab.market_follows f where f.follower_id=actor and f.followed_id=p.id) following from public.profiles p');
end $adapt$;
commit;
