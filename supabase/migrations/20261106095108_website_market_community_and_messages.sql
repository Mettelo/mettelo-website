begin;
create table private_website_lab.market_blocks(
 blocker_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id)
);
create index market_blocks_target on private_website_lab.market_blocks(blocked_id,blocker_id);
create table private_website_lab.market_posts(
 id uuid primary key default gen_random_uuid(),author_id uuid not null references auth.users(id),
 kind text not null check(kind in ('update','question','showcase','collaborators')),
 body text not null check(length(body) between 10 and 5000),topics text[] not null default '{}',
 project_ref text references public.website_project_briefs(project_ref),team_id uuid references public.website_project_teams(id),
 state text not null default 'published' check(state in ('published','removed')),client_nonce uuid not null,
 created_at timestamptz not null default now(),unique(author_id,client_nonce),check(cardinality(topics)<=10)
);
create index market_posts_feed on private_website_lab.market_posts(created_at desc,id desc) where state='published';
create index market_posts_author on private_website_lab.market_posts(author_id,created_at desc);
create table private_website_lab.market_comments(
 id uuid primary key default gen_random_uuid(),post_id uuid not null references private_website_lab.market_posts(id),
 author_id uuid not null references auth.users(id),parent_id uuid references private_website_lab.market_comments(id),
 body text not null check(length(body) between 1 and 2000),state text not null default 'published' check(state in ('published','removed')),
 client_nonce uuid not null,created_at timestamptz not null default now(),unique(author_id,client_nonce)
);
create index market_comments_post on private_website_lab.market_comments(post_id,created_at desc,id desc);
create index market_comments_author on private_website_lab.market_comments(author_id,created_at desc);
create table private_website_lab.market_post_marks(
 post_id uuid not null references private_website_lab.market_posts(id),user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('like','bookmark')),created_at timestamptz not null default now(),primary key(post_id,user_id,kind)
);
create index market_marks_user on private_website_lab.market_post_marks(user_id,kind,post_id);
create table private_website_lab.market_follows(
 follower_id uuid not null references auth.users(id) on delete cascade,followed_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(follower_id,followed_id),check(follower_id<>followed_id)
);
create index market_follows_target on private_website_lab.market_follows(followed_id,follower_id);
create table private_website_lab.market_conversations(
 id uuid primary key default gen_random_uuid(),member_a uuid not null references auth.users(id),member_b uuid not null references auth.users(id),
 requested_by uuid not null references auth.users(id),state text not null default 'requested' check(state in ('requested','accepted','declined')),
 read_a_at timestamptz,read_b_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(member_a,member_b),check(member_a<member_b),check(requested_by in (member_a,member_b))
);
create index market_conversations_b on private_website_lab.market_conversations(member_b,updated_at desc);
create index market_conversations_a on private_website_lab.market_conversations(member_a,updated_at desc);
create table private_website_lab.market_messages(
 id uuid primary key default gen_random_uuid(),conversation_id uuid not null references private_website_lab.market_conversations(id),
 sender_id uuid not null references auth.users(id),body text not null check(length(body) between 1 and 3000),
 project_ref text references public.website_project_briefs(project_ref),client_nonce uuid not null,
 created_at timestamptz not null default now(),unique(sender_id,client_nonce)
);
create index market_messages_conversation on private_website_lab.market_messages(conversation_id,created_at desc,id desc);
create index market_messages_sender on private_website_lab.market_messages(sender_id,created_at desc);
create table private_website_lab.market_reports(
 id uuid primary key default gen_random_uuid(),reporter_id uuid not null references auth.users(id),
 kind text not null check(kind in ('post','comment','message','member')),target_id uuid not null,
 reason text not null check(length(reason) between 8 and 1000),snapshot jsonb not null,
 state text not null default 'open' check(state in ('open','resolved')),reviewer_id uuid references auth.users(id),review_note text,
 created_at timestamptz not null default now(),resolved_at timestamptz
);
create unique index market_reports_pending on private_website_lab.market_reports(reporter_id,kind,target_id) where state='open';
create index market_reports_queue on private_website_lab.market_reports(state,created_at,id);
create index market_reports_author on private_website_lab.market_reports(reporter_id,created_at desc);
do $$declare tab text;begin
 foreach tab in array array['market_blocks','market_posts','market_comments','market_post_marks','market_follows','market_conversations','market_messages','market_reports'] loop
 execute format('alter table private_website_lab.%I enable row level security',tab);
 execute format('revoke all on private_website_lab.%I from public,anon,authenticated',tab);
 end loop;
end $$;
create function private_website_lab.market_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private_website_lab.market_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a))
$$;
create function private_website_lab.market_post_visible(pid uuid,uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private_website_lab.market_posts p where p.id=pid and p.state='published' and private_website_lab.account_allowed(p.author_id) and not private_website_lab.market_blocked(p.author_id,uid))
$$;
create function private_website_lab.market_social(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid();target uuid:=nullif(p_payload->>'member_id','')::uuid;pid uuid:=nullif(p_payload->>'post_id','')::uuid;
 cid uuid:=nullif(p_payload->>'conversation_id','')::uuid;comment_id uuid:=nullif(p_payload->>'comment_id','')::uuid;rid uuid:=nullif(p_payload->>'report_id','')::uuid;
 nonce uuid:=nullif(p_payload->>'client_nonce','')::uuid;parent uuid:=nullif(p_payload->>'parent_id','')::uuid;
 post private_website_lab.market_posts;conv private_website_lab.market_conversations;report private_website_lab.market_reports;
 body text:=btrim(p_payload->>'body');kind text:=p_payload->>'kind';ref text:=nullif(p_payload->>'project_ref','');tid uuid:=nullif(p_payload->>'team_id','')::uuid;
 pg integer:=greatest(1,least(100000,coalesce((p_payload->>'page')::integer,1)));q text:=left(btrim(coalesce(p_payload->>'q','')),150);
 before_at timestamptz:=coalesce(nullif(p_payload->>'before_at','')::timestamptz,'infinity');before_id uuid:=coalesce(nullif(p_payload->>'before_id','')::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff');
 result jsonb;rows jsonb;sn jsonb;counterparty uuid;desired boolean:=coalesce((p_payload->>'enabled')::boolean,true);subjects text[];mention record;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not private_website_lab.account_allowed(actor) then raise exception 'Verified account access required' using errcode='42501';end if;
 if p_action='feed' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from (
   select p.id,p.author_id,coalesce(pr.full_name,pr.username,'Member') author,pr.username,p.kind,left(p.body,500) body,p.topics,p.project_ref,p.team_id,p.created_at,
   (select count(*) from private_website_lab.market_post_marks m where m.post_id=p.id and m.kind='like' and not private_website_lab.market_blocked(m.user_id,actor)) likes,
   (select count(*) from private_website_lab.market_comments c where c.post_id=p.id and c.state='published' and not private_website_lab.market_blocked(c.author_id,actor) and private_website_lab.account_allowed(c.author_id)) comments,
   exists(select 1 from private_website_lab.market_post_marks m where m.post_id=p.id and m.user_id=actor and m.kind='like') liked,
   exists(select 1 from private_website_lab.market_post_marks m where m.post_id=p.id and m.user_id=actor and m.kind='bookmark') bookmarked,
   exists(select 1 from private_website_lab.market_follows f where f.follower_id=actor and f.followed_id=p.author_id) following
   from private_website_lab.market_posts p left join public.profiles pr on pr.id=p.author_id
   where p.state='published' and private_website_lab.account_allowed(p.author_id) and not private_website_lab.market_blocked(p.author_id,actor)
   and (p.created_at,p.id)<(before_at,before_id)
   and (q='' or concat_ws(' ',p.body,p.topics::text,pr.full_name,pr.username) ilike '%'||q||'%')
   and (coalesce(p_payload->>'view','all')<>'following' or exists(select 1 from private_website_lab.market_follows f where f.follower_id=actor and f.followed_id=p.author_id))
   and (coalesce(p_payload->>'view','all')<>'bookmarks' or exists(select 1 from private_website_lab.market_post_marks m where m.post_id=p.id and m.user_id=actor and m.kind='bookmark'))
   order by p.created_at desc,p.id desc limit 25
  ) x;
  return jsonb_build_object('rows',rows,'page_size',25);
 elsif p_action='post' then
  if not private_website_lab.market_post_visible(pid,actor) then raise exception 'Post unavailable' using errcode='42501';end if;
  select to_jsonb(p)||jsonb_build_object('author',coalesce(pr.full_name,pr.username,'Member'),'username',pr.username) into result from private_website_lab.market_posts p left join public.profiles pr on pr.id=p.author_id where p.id=pid;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from (
   select c.id,c.author_id,coalesce(pr.full_name,pr.username,'Member') author,c.parent_id,c.body,c.created_at
   from private_website_lab.market_comments c left join public.profiles pr on pr.id=c.author_id
   where c.post_id=pid and c.state='published' and private_website_lab.account_allowed(c.author_id) and not private_website_lab.market_blocked(c.author_id,actor) and (c.created_at,c.id)<(before_at,before_id)
   order by c.created_at desc,c.id desc limit 25
  )x;
  return jsonb_build_object('post',result-'client_nonce','comments',rows);
 elsif p_action='conversations' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from (
   select c.id,c.state,c.requested_by,c.updated_at,case when c.member_a=actor then c.member_b else c.member_a end member_id,
   coalesce(pr.full_name,pr.username,'Member') name,
   (select count(*) from private_website_lab.market_messages m where m.conversation_id=c.id and m.sender_id<>actor and m.created_at>coalesce(case when c.member_a=actor then c.read_a_at else c.read_b_at end,'-infinity')) unread
   from private_website_lab.market_conversations c left join public.profiles pr on pr.id=case when c.member_a=actor then c.member_b else c.member_a end
   where actor in(c.member_a,c.member_b) and not private_website_lab.market_blocked(c.member_a,c.member_b) and private_website_lab.account_allowed(case when c.member_a=actor then c.member_b else c.member_a end)
   order by c.updated_at desc,c.id limit 25 offset (pg-1)*25
  )x;return jsonb_build_object('rows',rows,'page_size',25);
 elsif p_action='blocks' then
  return jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select b.blocked_id id,coalesce(pr.full_name,pr.username,'Member') name from private_website_lab.market_blocks b left join public.profiles pr on pr.id=b.blocked_id where b.blocker_id=actor order by b.created_at desc,b.blocked_id limit 25 offset (pg-1)*25)x),'[]'));
 elsif p_action='reports' then
  if not private_website_lab.permitted(actor,'operations') then raise exception 'Moderation access required' using errcode='42501';end if;
  return jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,kind,reason,snapshot,state,created_at from private_website_lab.market_reports where state='open' order by created_at,id limit 25 offset (pg-1)*25)x),'[]'));
 end if;
 -- The same sorted participant locks serialize sends, blocks and admission.
 if cid is not null then select * into conv from private_website_lab.market_conversations where id=cid;target:=case when conv.member_a=actor then conv.member_b else conv.member_a end;end if;
 perform private_website_lab.participation_locks(array[actor,target]);
 if p_action in ('conversation','message','message_decision') then
  select * into conv from private_website_lab.market_conversations where id=cid for update;
  if conv.id is null or actor not in(conv.member_a,conv.member_b) or private_website_lab.market_blocked(conv.member_a,conv.member_b) or not private_website_lab.account_allowed(target) then raise exception 'Conversation unavailable' using errcode='42501';end if;
 end if;
 if p_action='conversation' then
  -- Only the two participants can inspect this thread; moderators receive reported excerpts only.
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from(select m.id,m.sender_id,m.body,m.project_ref,m.created_at from private_website_lab.market_messages m where m.conversation_id=cid and (m.created_at,m.id)<(before_at,before_id) order by m.created_at desc,m.id desc limit 25)x;
  update private_website_lab.market_conversations set read_a_at=case when member_a=actor then now() else read_a_at end,read_b_at=case when member_b=actor then now() else read_b_at end where id=cid;
  return jsonb_build_object('conversation',jsonb_build_object('id',cid,'state',conv.state,'requested_by',conv.requested_by,'member_id',target,'name',(select coalesce(full_name,username,'Member') from public.profiles where id=target)),'messages',rows);
 elsif p_action='block' then
  if target is null or target=actor or not exists(select 1 from auth.users where id=target) then raise exception 'Choose another member';end if;
  if desired then
   insert into private_website_lab.market_blocks(blocker_id,blocked_id) values(actor,target) on conflict do nothing;
   delete from private_website_lab.market_follows where (follower_id=actor and followed_id=target) or (follower_id=target and followed_id=actor);
   update private_website_lab.market_conversations set state='declined',updated_at=now() where (member_a=least(actor,target) and member_b=greatest(actor,target));
   update private_website_lab.market_requests r set state='cancelled',decided_at=now(),decided_by=actor where state='pending' and ((r.member_id=actor and r.initiated_by=target) or (r.member_id=target and r.initiated_by=actor));
  else delete from private_website_lab.market_blocks where blocker_id=actor and blocked_id=target;end if;
 elsif p_action='follow' then
  if target is null or target=actor or private_website_lab.market_blocked(actor,target) or not private_website_lab.account_allowed(target) then raise exception 'Member unavailable' using errcode='42501';end if;
  if desired then insert into private_website_lab.market_follows(follower_id,followed_id) values(actor,target) on conflict do nothing;
  else delete from private_website_lab.market_follows where follower_id=actor and followed_id=target;end if;
 elsif p_action='publish' then
  if nonce is null then raise exception 'A submission identifier is required';end if;
  select id into pid from private_website_lab.market_posts where author_id=actor and client_nonce=nonce;
  if pid is not null then return jsonb_build_object('ok',true,'post_id',pid);end if;
  if (select count(*) from private_website_lab.market_posts where author_id=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Post limit reached; try again later';end if;
  if kind='collaborators' and (tid is null or not private_website_lab.market_leader(tid,actor) or not exists(select 1 from private_website_lab.market_recruitment s where s.team_id=tid and s.open and s.collaborator_capacity>private_website_lab.market_occupied(tid))) then raise exception 'Open recruitment for a Lab you lead is required' using errcode='42501';end if;
  if tid is not null then
   if not private_website_lab.market_leader(tid,actor) then raise exception 'Only the active official leader may publicly reference this Lab' using errcode='42501';end if;
   select project_ref into ref from public.website_project_teams where id=tid;
  end if;
  select array_agg(left(btrim(s),60)) into subjects from jsonb_array_elements_text(coalesce(p_payload->'topics','[]'))s;
  insert into private_website_lab.market_posts(author_id,kind,body,topics,project_ref,team_id,client_nonce) values(actor,kind,body,coalesce(subjects,'{}'),ref,tid,nonce) returning id into pid;
 elsif p_action='comment' then
  if not private_website_lab.market_post_visible(pid,actor) then raise exception 'Post unavailable' using errcode='42501';end if;
  if nonce is null then raise exception 'A submission identifier is required';end if;
  if exists(select 1 from private_website_lab.market_comments where author_id=actor and client_nonce=nonce) then return jsonb_build_object('ok',true,'post_id',pid);end if;
  if parent is not null and not exists(select 1 from private_website_lab.market_comments c where c.id=parent and c.post_id=pid and c.parent_id is null and c.state='published' and not private_website_lab.market_blocked(c.author_id,actor)) then raise exception 'Replies support one level below a visible comment';end if;
  if (select count(*) from private_website_lab.market_comments where author_id=actor and created_at>now()-interval '1 minute')>=10 then raise exception 'Comment limit reached; try again later';end if;
  insert into private_website_lab.market_comments(post_id,author_id,parent_id,body,client_nonce) values(pid,actor,parent,body,nonce) returning id into comment_id;
  perform private_website_lab.notify_member((select author_id from private_website_lab.market_posts where id=pid),'market-comment:'||comment_id,'A new reply to your Market post','/member/market/community?post='||pid);
 elsif p_action in ('like','bookmark') then
  if not private_website_lab.market_post_visible(pid,actor) then raise exception 'Post unavailable' using errcode='42501';end if;
  if desired then insert into private_website_lab.market_post_marks(post_id,user_id,kind) values(pid,actor,p_action) on conflict do nothing;
  else delete from private_website_lab.market_post_marks where post_id=pid and user_id=actor and kind=p_action;end if;
 elsif p_action='delete_post' then
  update private_website_lab.market_posts set state='removed' where id=pid and author_id=actor;
  if not found then raise exception 'Only the author can remove this post' using errcode='42501';end if;
 elsif p_action='message_request' then
  if target is null or target=actor or not exists(select 1 from auth.users where id=target and email_confirmed_at is not null) or not private_website_lab.account_allowed(target) or private_website_lab.market_blocked(actor,target) then raise exception 'Member unavailable' using errcode='42501';end if;
  select * into conv from private_website_lab.market_conversations where member_a=least(actor,target) and member_b=greatest(actor,target) for update;
  if conv.id is not null then return jsonb_build_object('ok',true,'conversation_id',conv.id);end if;
  if not exists(select 1 from private_website_lab.market_preferences where user_id=target and contactable) then raise exception 'This member is not accepting message requests' using errcode='42501';end if;
  if nonce is null then raise exception 'A submission identifier is required';end if;
  if (select count(*) from private_website_lab.market_conversations where requested_by=actor and created_at>now()-interval '1 day')>=10 then raise exception 'Message request limit reached; try again tomorrow';end if;
  insert into private_website_lab.market_conversations(member_a,member_b,requested_by) values(least(actor,target),greatest(actor,target),actor) returning id into cid;
  insert into private_website_lab.market_messages(conversation_id,sender_id,body,project_ref,client_nonce) values(cid,actor,body,ref,nonce);
  perform private_website_lab.notify_member(target,'market-dm-request:'||cid,'A member sent a message request','/member/market/messages?conversation='||cid);
 elsif p_action='message_decision' then
  if conv.requested_by=actor or conv.state<>'requested' then raise exception 'Only the recipient can decide a pending message request' using errcode='42501';end if;
  update private_website_lab.market_conversations set state=case when desired then 'accepted' else 'declined' end,updated_at=now() where id=cid;
  perform private_website_lab.notify_member(target,'market-dm-decision:'||cid,'Your message request was reviewed','/member/market/messages?conversation='||cid);
 elsif p_action='message' then
  if conv.state<>'accepted' then raise exception 'The recipient must accept before further messages can be sent';end if;
  if nonce is null then raise exception 'A submission identifier is required';end if;
  if exists(select 1 from private_website_lab.market_messages where sender_id=actor and client_nonce=nonce) then return jsonb_build_object('ok',true,'conversation_id',cid);end if;
  if (select count(*) from private_website_lab.market_messages where sender_id=actor and created_at>now()-interval '1 minute')>=20 then raise exception 'Message limit reached; try again later';end if;
  insert into private_website_lab.market_messages(conversation_id,sender_id,body,project_ref,client_nonce) values(cid,actor,body,ref,nonce);
  update private_website_lab.market_conversations set updated_at=now() where id=cid;
  perform private_website_lab.notify_member(target,'market-dm:'||cid||':'||nonce,'You have a new Market message','/member/market/messages?conversation='||cid);
 elsif p_action='report' then
  if (select count(*) from private_website_lab.market_reports where reporter_id=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Report limit reached; try again later';end if;
  rid:=nullif(p_payload->>'target_id','')::uuid;
  if kind='post' and private_website_lab.market_post_visible(rid,actor) then select jsonb_build_object('author_id',p.author_id,'body',p.body) into sn from private_website_lab.market_posts p where p.id=rid;
  elsif kind='comment' then select jsonb_build_object('author_id',c.author_id,'body',c.body) into sn from private_website_lab.market_comments c where c.id=rid and c.state='published' and private_website_lab.market_post_visible(c.post_id,actor) and not private_website_lab.market_blocked(c.author_id,actor);
  elsif kind='message' then select jsonb_build_object('author_id',m.sender_id,'body',m.body) into sn from private_website_lab.market_messages m join private_website_lab.market_conversations c on c.id=m.conversation_id where m.id=rid and actor in(c.member_a,c.member_b);
  elsif kind='member' then select jsonb_build_object('author_id',p.id,'username',p.username,'headline',p.headline) into sn from public.profiles p where p.id=rid and (exists(select 1 from private_website_lab.market_preferences where user_id=rid and discoverable) or exists(select 1 from private_website_lab.market_conversations c where actor in(c.member_a,c.member_b) and rid in(c.member_a,c.member_b)));
  end if;
  if sn is null then raise exception 'Only content you can access can be reported' using errcode='42501';end if;
  insert into private_website_lab.market_reports(reporter_id,kind,target_id,reason,snapshot) values(actor,kind,rid,btrim(p_payload->>'reason'),sn) on conflict(reporter_id,kind,target_id) where state='open' do nothing;
 elsif p_action='resolve_report' then
  if not private_website_lab.permitted(actor,'operations') then raise exception 'Moderation access required' using errcode='42501';end if;
  if length(btrim(coalesce(p_payload->>'reason',''))) not between 8 and 1000 then raise exception 'A review reason is required';end if;
  select * into report from private_website_lab.market_reports where id=rid for update;
  if report.id is null or report.state<>'open' then raise exception 'Open report required';end if;
  if desired and report.kind='post' then update private_website_lab.market_posts set state='removed' where id=report.target_id;
  elsif desired and report.kind='comment' then update private_website_lab.market_comments set state='removed' where id=report.target_id;
  elsif desired and report.kind in ('message','member') then raise exception 'Record the finding here; account restrictions require the existing account administration process';end if;
  update private_website_lab.market_reports set state='resolved',reviewer_id=actor,review_note=btrim(p_payload->>'reason'),resolved_at=now() where id=rid;
  insert into private_website_lab.audit(actor_id,action,payload) values(actor,'market_report_review',jsonb_build_object('report_id',rid,'reason',left(p_payload->>'reason',1000),'content_removed',desired));
 else raise exception 'Unsupported community action';end if;
 -- Mentions notify only visible members; the post/comment remains ordinary text.
 if p_action in ('publish','comment') then
  for mention in select distinct p.id from regexp_matches(body,'@([a-zA-Z0-9_]{3,32})','g') m join public.profiles p on lower(p.username)=lower(m[1]) join private_website_lab.market_preferences s on s.user_id=p.id and s.discoverable where p.id<>actor and not private_website_lab.market_blocked(p.id,actor) limit 5 loop
   perform private_website_lab.notify_member(mention.id,'market-mention:'||coalesce(comment_id,pid)||':'||mention.id,'You were mentioned in Lab Market','/member/market/community?post='||pid);
  end loop;
 end if;
 return jsonb_build_object('ok',true,'post_id',pid,'conversation_id',cid);
end $$;
revoke all on function private_website_lab.market_blocked(uuid,uuid),private_website_lab.market_post_visible(uuid,uuid),private_website_lab.market_social(text,jsonb) from public,anon,authenticated;
-- Apply blocking to the established admission path, including acceptance after an invitation was sent.
do $$declare src text;begin
 src:=pg_get_functiondef('private_website_lab.market(text,jsonb)'::regprocedure);
 src:=replace(src,'s.discoverable and private_website_lab.account_allowed(p.id)','s.discoverable and not private_website_lab.market_blocked(actor,p.id) and private_website_lab.account_allowed(p.id)');
 src:=replace(src,$needle$elsif p_action in ('request','invite') then$needle$,E'elsif p_action in (''request'',''invite'') then\n  if private_website_lab.market_blocked(target,t.coordinator_id) then raise exception ''Collaboration unavailable'' using errcode=''42501'';end if;');
 src:=replace(src,$needle$if p_action='accept' then$needle$,E'if p_action=''accept'' then\n   if private_website_lab.market_blocked(target,t.coordinator_id) then raise exception ''Collaboration unavailable'' using errcode=''42501'';end if;');
 execute src;
end $$;
create function public.website_lab_community(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private_website_lab.market_social(p_action,p_payload) $$;
revoke all on function public.website_lab_community(text,jsonb) from public,anon;
grant execute on function public.website_lab_community(text,jsonb),private_website_lab.market_social(text,jsonb) to authenticated;
commit;
