-- Synthetic evidence and share/feed records roll back, including temporary pilot access changes.
begin;
do $$declare tid uuid; actor uuid; reviewer uuid; evidence uuid; other_evidence uuid; milestone uuid; result jsonb; payload jsonb; outsider uuid:=gen_random_uuid(); denied boolean; n integer; begin
 select t.id,t.coordinator_id into tid,reviewer from public.website_project_teams t where t.status='active' and t.lab_enabled and exists(select 1 from public.website_project_team_members m where m.team_id=t.id and m.user_id<>t.coordinator_id and m.status='confirmed' and m.admitted_at is not null) limit 1;
 select user_id into actor from public.website_project_team_members where team_id=tid and user_id<>reviewer and status='confirmed' and admitted_at is not null limit 1;
 assert actor is not null,'An admitted isolated pilot member is required';
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(outsider,'proof-share-qa-'||outsider||'@example.test',now(),'{}');
 insert into private_website_lab.items(team_id,kind,title,body,url,author_id,owner_id) values(tid,'contribution','[SHARE-QA] Confidential source','PRIVATE SOURCE TEXT MUST NEVER AUTOMATICALLY APPEAR PUBLICLY','https://github.com/example/private-qa',actor,actor) returning id into evidence;
 insert into private_website_lab.items(team_id,kind,title,body,url,author_id,owner_id) values(tid,'contribution','[SHARE-QA] Someone else','Private evidence belonging to another author.','https://github.com/example/other-qa',reviewer,reviewer) returning id into other_evidence;
 insert into private_website_lab.items(team_id,kind,title,body,owner_id,author_id,status,milestone_accepted_at,milestone_accepted_by,milestone_evidence_id) values(tid,'milestone','[SHARE-QA] Milestone','Private milestone details.',actor,reviewer,'done',now(),reviewer,evidence) returning id into milestone;
 perform set_config('test.share.team',tid::text,true);perform set_config('test.share.actor',actor::text,true);perform set_config('test.share.outsider',outsider::text,true);perform set_config('test.share.evidence',evidence::text,true);perform set_config('test.share.milestone',milestone::text,true);
 perform set_config('request.jwt.claim.sub',actor::text,true);
 payload:=jsonb_build_object('kind','contribution','source_id',evidence,'client_nonce',gen_random_uuid(),'approved_public',true,'title','[SHARE-QA] Selected public work','summary','An edited public outcome with no private source details.','author_display','Example member','skills',jsonb_build_array('SQL'));
 denied:=false;begin perform public.website_portfolio_sharing('create',payload||'{"approved_public":false}');exception when raise_exception then denied:=true;end;assert denied,'Public sharing bypassed consent';
 denied:=false;begin perform public.website_portfolio_sharing('create',payload||jsonb_build_object('source_id',other_evidence));exception when insufficient_privilege then denied:=true;end;assert denied,'Another author evidence shared';
 denied:=false;begin perform public.website_portfolio_sharing('create',payload||'{"kind":"milestone"}');exception when insufficient_privilege then denied:=true;end;assert denied,'Source category spoofed';
 denied:=false;begin perform public.website_portfolio_sharing('create',payload||'{"include_evidence":true,"evidence_url":"https://u:p@example.test/private"}');exception when raise_exception then denied:=true;end;assert denied,'Credential URL accepted';
 select count(*) into n from private_website_lab.market_posts;
 result:=public.website_portfolio_sharing('create',payload);assert result=public.website_portfolio_sharing('create',payload),'Sharing retry duplicated link';
 assert (select count(*) from private_website_lab.market_posts)=n,'Creating a link automatically posted to feed';
 perform set_config('test.share.id',result->>'id',true);perform set_config('test.share.token',result->>'token',true);
 payload:=payload||jsonb_build_object('kind','milestone','source_id',milestone,'client_nonce',gen_random_uuid());
 result:=public.website_portfolio_sharing('create',payload);assert public.website_public_portfolio_share((result->>'token')::uuid)->>'source_review_state'='reviewed';
 perform set_config('test.share.milestone_token',result->>'token',true);
end $$;
set local role anon;
do $$declare r jsonb;begin
 r:=public.website_public_portfolio_share(current_setting('test.share.token')::uuid);
 assert r->>'summary'='An edited public outcome with no private source details.';
 assert r->>'evidence_url' is null;
 assert not (r ?| array['owner_id','author_id','team_id','source_id','body','token','review_note']);
 assert strpos(r::text,'PRIVATE SOURCE')=0 and strpos(r::text,'private-qa')=0,'Private source copied into public summary';
 assert not has_function_privilege('anon','public.website_portfolio_sharing(text,jsonb)','EXECUTE');
 assert not has_function_privilege('anon','private_portfolio_shares.source(uuid,text,uuid)','EXECUTE');
 assert not has_table_privilege('anon','private_portfolio_shares.shares','SELECT');
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.share.actor'),true);
do $$declare r jsonb;begin
 r:=public.website_portfolio_sharing('feed',jsonb_build_object('id',current_setting('test.share.id'),'origin','http://127.0.0.1:3001'));
 assert r->>'post_id' is not null,'Explicit feed publication failed';
 assert r=public.website_portfolio_sharing('feed',jsonb_build_object('id',current_setting('test.share.id'),'origin','http://127.0.0.1:3001')),'Feed retry duplicated post';
 perform set_config('test.share.post',r->>'post_id',true);
end $$;
reset role;
do $$begin
 assert exists(select 1 from private_website_lab.market_posts where id=current_setting('test.share.post')::uuid and state='published' and team_id is null and project_ref is null and strpos(left(body,500),'/proof/')>0),'Feed post lost link or implied official Lab attribution';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.share.outsider'),true);
do $$declare denied boolean:=false;begin
 assert (public.website_portfolio_sharing('list')->>'total')::int=0,'Share list leaked another member history';
 begin perform public.website_portfolio_sharing('revoke',jsonb_build_object('id',current_setting('test.share.id')));exception when insufficient_privilege then denied:=true;end;assert denied,'Outsider revoked share';
end $$;
reset role;
savepoint share_states;
update public.website_project_team_members set admitted_at=null where team_id=current_setting('test.share.team')::uuid and user_id=current_setting('test.share.actor')::uuid;
do $$begin
 assert public.website_public_portfolio_share(current_setting('test.share.token')::uuid) is null,'Revoked Lab access left a public summary';
 assert exists(select 1 from private_website_lab.market_posts where id=current_setting('test.share.post')::uuid and state='removed'),'Access revocation left a feed post';
end $$;
rollback to savepoint share_states;
update public.website_project_teams set status='paused' where id=current_setting('test.share.team')::uuid;
do $$begin assert public.website_public_portfolio_share(current_setting('test.share.token')::uuid) is null;assert exists(select 1 from private_website_lab.market_posts where id=current_setting('test.share.post')::uuid and state='removed'),'Paused access did not remove share post';end $$;
rollback to savepoint share_states;
update private_website_lab.items set url=null where id=current_setting('test.share.evidence')::uuid;
do $$begin assert public.website_public_portfolio_share(current_setting('test.share.milestone_token')::uuid) is null,'Invalidated evidence left an accepted milestone share';end $$;
rollback to savepoint share_states;
update public.website_project_teams set status='completed' where id=current_setting('test.share.team')::uuid;
insert into private_website_lab.deliveries(team_id,evidence_id,confirmed_by,note) values(current_setting('test.share.team')::uuid,current_setting('test.share.evidence')::uuid,(select coordinator_id from public.website_project_teams where id=current_setting('test.share.team')::uuid),'[SHARE-QA] Confirmed synthetic delivery');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.share.actor'),true);
do $$declare payload jsonb; r jsonb; denied boolean:=false;begin
 payload:=jsonb_build_object('kind','delivery','source_id',current_setting('test.share.team'),'client_nonce',gen_random_uuid(),'approved_public',true,'title','[SHARE-QA] Team delivery','summary','A completed team outcome with an explicit individual contribution.','author_display','Example member','skills','[]'::jsonb);
 begin perform public.website_portfolio_sharing('create',payload);exception when raise_exception then denied:=true;end;assert denied,'Team delivery omitted personal contribution';
 r:=public.website_portfolio_sharing('create',payload||'{"individual_part":"I wrote the synthetic query and documentation."}');
 assert public.website_public_portfolio_share((r->>'token')::uuid)->>'source_review_state'='team-outcome';
 perform public.website_portfolio_sharing('revoke',jsonb_build_object('id',current_setting('test.share.id')));
 assert public.website_public_portfolio_share(current_setting('test.share.token')::uuid) is null,'Explicit revoke left public access';
end $$;
reset role;
do $$begin assert exists(select 1 from private_website_lab.market_posts where id=current_setting('test.share.post')::uuid and state='removed');end $$;
select 'Proof sharing: consent, authorship, category, privacy, anonymous projection, idempotency, explicit feed, revocation, pause, evidence validity and personal team contribution passed.' result;
rollback;
