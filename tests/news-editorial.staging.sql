begin;
select set_config('test.news_admin',(select user_id::text from private_website_lab.admins a join auth.users u on u.id=a.user_id where u.email_confirmed_at is not null limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('test.news_admin'),true);
set local role authenticated;
do $$
declare id constant uuid:='a1400000-0000-4000-8000-000000000001';doc jsonb;result jsonb;
begin
 if not (public.website_news_admin('access')->>'allowed')::boolean then raise exception 'Admin fixture missing';end if;
 doc:=jsonb_build_object('title','[STAGING TEST] Editorial lifecycle','excerpt','A synthetic summary used only to test editorial permissions and publication.','body',repeat('This is synthetic editorial test content. ',5),'author','Mettelo Test','category','Data','format','blog','cover_url','','cover_alt','','source_name','','source_url','');
 result:=public.website_news_admin('save',jsonb_build_object('id',id,'revision',0,'slug','staging-editorial-lifecycle-test','document',doc));
 if result->>'status'<>'draft' or result->>'revision'<>'1' then raise exception 'New drafts must remain private';end if;
 if public.website_news_public('staging-editorial-lifecycle-test') is not null then raise exception 'Draft leaked';end if;
 begin perform public.website_news_admin('publish',jsonb_build_object('id',id,'revision',0));raise exception 'Stale revision accepted';exception when serialization_failure then null;end;
 result:=public.website_news_admin('publish',jsonb_build_object('id',id,'revision',1));
 if public.website_news_public('staging-editorial-lifecycle-test')->>'title'<>doc->>'title' then raise exception 'Published article absent';end if;
 if public.website_news_public('staging-editorial-lifecycle-test') ?| array['draft','created_by','updated_by','revision','id'] then raise exception 'Internal fields leaked';end if;
 doc:=jsonb_set(doc,'{title}','"[STAGING TEST] Private revision"');
 result:=public.website_news_admin('save',jsonb_build_object('id',id,'revision',2,'slug','staging-editorial-lifecycle-test','document',doc));
 if public.website_news_public('staging-editorial-lifecycle-test')->>'title'='[STAGING TEST] Private revision' then raise exception 'Saving draft changed published content';end if;
 begin perform public.website_news_admin('save',jsonb_build_object('id',id,'revision',3,'slug','changed-published-url','document',doc));raise exception 'Published URL changed';exception when raise_exception then if sqlerrm='Published URL changed' then raise;end if;end;
 begin perform public.website_news_admin('save',jsonb_build_object('id','a1400000-0000-4000-8000-000000000002','revision',0,'slug','staging-editorial-lifecycle-test','document',doc));raise exception 'Duplicate slug accepted';exception when unique_violation then null;end;
 begin perform public.website_news_admin('save',jsonb_build_object('id',id,'revision',3,'slug','staging-editorial-lifecycle-test','document',jsonb_set(doc,'{source_url}','"javascript:alert(1)"')));raise exception 'Unsafe URL accepted';exception when raise_exception then if sqlerrm='Unsafe URL accepted' then raise;end if;end;
 result:=public.website_news_admin('publish',jsonb_build_object('id',id,'revision',3));
 if public.website_news_public('staging-editorial-lifecycle-test')->>'title'<>doc->>'title' then raise exception 'Explicit publish failed';end if;
 if (public.website_news_public(null,'{"q":"Private revision","category":"Data","format":"blog"}') ->>'total')::integer<1 then raise exception 'Search failed';end if;
 result:=public.website_news_admin('unpublish',jsonb_build_object('id',id,'revision',4));
 if public.website_news_public('staging-editorial-lifecycle-test') is not null then raise exception 'Unpublished article still visible';end if;
 begin perform count(*) from private_website_news.articles;raise exception 'Direct table read allowed';exception when insufficient_privilege then null;end;
 doc:=jsonb_set(doc,'{body}','"Too short"');
 result:=public.website_news_admin('save',jsonb_build_object('id',id,'revision',5,'slug','staging-editorial-lifecycle-test','document',doc));
 begin perform public.website_news_admin('publish',jsonb_build_object('id',id,'revision',6));raise exception 'Incomplete publication accepted';exception when raise_exception then if sqlerrm='Incomplete publication accepted' then raise;end if;end;
end $$;
do $$
declare n integer;aid uuid;doc jsonb;result jsonb;
begin
 doc:=jsonb_build_object('title','pagination-fixture','excerpt','Synthetic article for verifying bounded public pagination.','body',repeat('Synthetic pagination content. ',6),'author','Mettelo Test','category','Data','format','blog','cover_url','','cover_alt','','source_name','','source_url','');
 for n in 1..13 loop
  aid:=md5('news-pagination-fixture-'||n)::uuid;
  perform public.website_news_admin('save',jsonb_build_object('id',aid,'revision',0,'slug','staging-pagination-fixture-'||n,'document',jsonb_set(doc,'{title}',to_jsonb('pagination-fixture '||n))));
  perform public.website_news_admin('publish',jsonb_build_object('id',aid,'revision',1));
 end loop;
 result:=public.website_news_public(null,'{"q":"pagination-fixture","page":1}');
 if result->>'total'<>'13' or jsonb_array_length(result->'items')<>12 then raise exception 'First page is not bounded';end if;
 result:=public.website_news_public(null,'{"q":"pagination-fixture","page":2}');
 if jsonb_array_length(result->'items')<>1 then raise exception 'Second page is incorrect';end if;
 if (result->'items'->0) ? 'body' then raise exception 'List response includes article bodies';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','a1400000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$begin
 if (public.website_news_admin('access')->>'allowed')::boolean then raise exception 'Non-admin granted access';end if;
 begin perform public.website_news_admin('list');raise exception 'Non-admin list allowed';exception when insufficient_privilege then null;end;
 begin perform public.website_news_admin('get','{"id":"a1400000-0000-4000-8000-000000000001"}');raise exception 'Non-admin draft read allowed';exception when insufficient_privilege then null;end;
 begin perform public.website_news_admin('publish','{"id":"a1400000-0000-4000-8000-000000000001","revision":6}');raise exception 'Non-admin publication allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$begin
 if public.website_news_public('staging-editorial-lifecycle-test') is not null then raise exception 'Anonymous draft read allowed';end if;
 if has_function_privilege('anon','public.website_news_admin(text,jsonb)','EXECUTE') then raise exception 'Anonymous editor access allowed';end if;
 begin perform count(*) from private_website_news.articles;raise exception 'Anonymous direct read allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'News editorial lifecycle and permissions passed; fixtures rolled back.' as result;
