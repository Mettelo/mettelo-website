begin;
do $privacy$ declare src text;needle text;begin
 src:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 needle:=$n$select md5('proposal:'||p.id)::uuid id,p.id source_id,p.owner_id author_id,coalesce(pr.full_name,pr.username,'Member') author,pr.username,$n$;
 if strpos(src,needle)=0 then raise exception 'Expected approved-project projection missing';end if;
 src:=replace(src,needle,$r$select md5('proposal:'||p.id)::uuid id,p.id source_id,''::text author_id,'Approved member project'::text author,null::text username,$r$);
 src:=replace(src,'from private_website_lab.market_proposals p left join public.profiles pr on pr.id=p.owner_id','from private_website_lab.market_proposals p');
 src:=replace(src,$n$or exists(select 1 from private_website_lab.market_follows f where f.follower_id=actor and f.followed_id=p.owner_id)
     $n$,'');
 execute src;
end $privacy$;
commit;
