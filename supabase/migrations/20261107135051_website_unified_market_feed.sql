begin;
alter table private_website_lab.market_posts drop constraint market_posts_kind_check;
alter table private_website_lab.market_posts add constraint market_posts_kind_check check(kind in ('update','question','showcase','collaborators','idea','project'));
create index market_posts_category_feed on private_website_lab.market_posts(kind,created_at desc,id desc) where state='published';
create index market_recruitment_stream on private_website_lab.market_recruitment(updated_at desc,team_id) where open;
create index market_approved_stream on private_website_lab.market_proposals(reviewed_at desc,id desc) where state='approved';

do $adapt$
declare src text; old_branch text; post_query text; start_pos integer; end_pos integer;
begin
 src:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 start_pos:=strpos(src,' if p_action=''feed'' then');
 end_pos:=strpos(src,' elsif p_action=''post'' then');
 if start_pos=0 or end_pos<=start_pos then raise exception 'Expected community feed branch missing';end if;
 old_branch:=substring(src from start_pos for end_pos-start_pos);
 post_query:=substring(old_branch from strpos(old_branch,'select p.id,p.author_id'));
 post_query:=substring(post_query from 1 for strpos(post_query,'order by p.created_at desc,p.id desc limit 25')-1);
 if length(post_query)<100 then raise exception 'Expected post projection missing';end if;
 post_query:=post_query||$post_filter$
 and (coalesce(p_payload->>'category','all')='all'
  or (p_payload->>'category'='updates' and p.kind in ('update','question','showcase'))
  or (p_payload->>'category'='projects' and p.kind='project')
  or (p_payload->>'category'='ideas' and p.kind='idea')
  or (p_payload->>'category'='seeking' and p.kind='collaborators'))
 order by p.created_at desc,p.id desc limit 25
$post_filter$;
 src:=replace(src,old_branch,$feed$
 if p_action='feed' then
  with post_candidates as materialized (
$feed$||post_query||$feed$
  ), project_candidates as materialized (
   select md5('project:'||t.id)::uuid id,t.id source_id,t.coordinator_id author_id,coalesce(pr.full_name,pr.username,'Project leader') author,pr.username,
    'project'::text kind,left(s.description,500) body,s.skills topics,t.project_ref,t.id team_id,s.updated_at created_at,b.title,s.roles,s.commitment,
    s.collaborator_capacity-private_website_lab.market_occupied(t.id) available
   from private_website_lab.market_recruitment s join public.website_project_teams t on t.id=s.team_id
   join public.website_project_briefs b on b.project_ref=t.project_ref left join public.profiles pr on pr.id=t.coordinator_id
   where coalesce(p_payload->>'category','all') in ('all','projects','seeking') and coalesce(p_payload->>'view','all')<>'bookmarks'
    and s.open and t.status='active' and t.lab_enabled and private_website_lab.market_leader(t.id,t.coordinator_id)
    and private_website_lab.account_allowed(t.coordinator_id) and not private_website_lab.market_blocked(actor,t.coordinator_id)
    and private_website_lab.market_occupied(t.id)<s.collaborator_capacity
    and (s.updated_at,md5('project:'||t.id)::uuid)<(before_at,before_id)
    and (q='' or concat_ws(' ',b.title,b.project_ref,s.description,s.roles::text,s.skills::text,s.commitment,pr.full_name,pr.username) ilike '%'||q||'%')
    and (coalesce(p_payload->>'view','all')<>'following'
     or exists(select 1 from private_website_lab.market_follows f where f.follower_id=actor and f.followed_id=t.coordinator_id)
     or exists(select 1 from private_website_lab.market_project_follows f where f.user_id=actor and f.project_ref=t.project_ref))
   order by s.updated_at desc,md5('project:'||t.id)::uuid desc limit 25
  ), idea_candidates as materialized (
   select md5('proposal:'||p.id)::uuid id,p.id source_id,p.owner_id author_id,coalesce(pr.full_name,pr.username,'Member') author,pr.username,
    'approved_idea'::text kind,left(p.description,500) body,p.skills topics,p.project_ref,coalesce(p.reviewed_at,p.updated_at) created_at,p.title,p.commitment
   from private_website_lab.market_proposals p left join public.profiles pr on pr.id=p.owner_id
   where coalesce(p_payload->>'category','all') in ('all','projects','ideas') and coalesce(p_payload->>'view','all')<>'bookmarks'
    and p.state='approved' and p.project_ref is not null and private_website_lab.account_allowed(p.owner_id) and not private_website_lab.market_blocked(actor,p.owner_id)
    and (coalesce(p.reviewed_at,p.updated_at),md5('proposal:'||p.id)::uuid)<(before_at,before_id)
    and (q='' or concat_ws(' ',p.title,p.description,p.category,p.skills::text,p.project_ref,pr.full_name,pr.username) ilike '%'||q||'%')
    and (coalesce(p_payload->>'view','all')<>'following'
     or exists(select 1 from private_website_lab.market_follows f where f.follower_id=actor and f.followed_id=p.owner_id)
     or exists(select 1 from private_website_lab.market_project_follows f where f.user_id=actor and f.project_ref=p.project_ref))
   order by coalesce(p.reviewed_at,p.updated_at) desc,md5('proposal:'||p.id)::uuid desc limit 25
  ), stream as (
   select x.id,x.created_at,to_jsonb(x)||jsonb_build_object('entry_type','post') entry from post_candidates x
   union all select x.id,x.created_at,to_jsonb(x)||jsonb_build_object('entry_type','project') from project_candidates x
   union all select x.id,x.created_at,to_jsonb(x)||jsonb_build_object('entry_type','proposal') from idea_candidates x
  ), page as (select * from stream order by created_at desc,id desc limit 25)
  select coalesce(jsonb_agg(entry order by created_at desc,id desc),'[]') into rows from page;
  return jsonb_build_object('rows',rows,'page_size',25);
$feed$);
 if strpos(src,$needle$if kind='collaborators' and$needle$)=0 then raise exception 'Expected recruitment authorization missing';end if;
 src:=replace(src,$needle$if kind='collaborators' and$needle$,$replacement$if kind in ('collaborators','project') and$replacement$);
 execute src;
end $adapt$;
commit;
