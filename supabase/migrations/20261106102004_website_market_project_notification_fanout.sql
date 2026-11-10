begin;
do $fix$ declare src text;begin
 src:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 src:=replace(src,$needle$for mention in select f.user_id id from private_website_lab.market_project_follows f where f.project_ref=ref and f.user_id<>actor and not private_website_lab.market_blocked(f.user_id,actor) limit 10000 loop
   perform private_website_lab.notify_member(mention.id,'market-followed-post:'||pid,'A project you follow has a public update','/member/market/community?post='||pid);
  end loop;$needle$,$replacement$insert into private_website_lab.notifications(recipient_id,event_key,title,href)
  select f.user_id,'market-followed-post:'||pid,'A project you follow has a public update','/member/market/community?post='||pid
  from private_website_lab.market_project_follows f left join private_website_lab.market_preferences s on s.user_id=f.user_id
  where f.project_ref=ref and f.user_id<>actor and coalesce(s.notify_community,true) and not private_website_lab.market_blocked(f.user_id,actor)
  on conflict(recipient_id,event_key) do nothing;$replacement$);
 execute src;
end $fix$;
commit;
