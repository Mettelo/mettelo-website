-- Synthetic editorial fixtures for Mettelo V2 Staging only. Never production content.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from private_website_lab.admins limit 1),true);
do $$
declare fixture record;doc jsonb;
begin
 for fixture in select * from (values
 ('a1400000-0000-4000-8000-000000000010'::uuid,'asking-better-questions-of-ai','Asking better questions of AI','AI & Machine Learning','news','Staging preview: how a clear question, a named source and an honest limitation can shape an AI discussion.'),
 ('a1400000-0000-4000-8000-000000000011'::uuid,'make-your-project-work-visible','Make your project work visible','Careers','blog','Staging preview: a simple way to explain what you contributed, how you worked and what you learned.')
 ) f(id,slug,title,category,format,excerpt) loop
 if not exists(select 1 from private_website_news.articles where id=fixture.id) then
 doc:=jsonb_build_object('title',fixture.title,'excerpt',fixture.excerpt,'author','Mettelo Editorial','category',fixture.category,'format',fixture.format,'body','This is synthetic demonstration content for the staging preview. It is not a report of a current event or a verified industry announcement.'||E'\n\n## Start with the context\n\nWrite down the problem, the people involved and the outcome you want to support. Make the boundaries of your work clear before presenting a conclusion.\n\n## Make your thinking visible\n\n- Describe the evidence you used.\n- Explain the decisions you made.\n- Record the questions that remain open.\n\n## Keep the conversation useful\n\nInvite feedback, distinguish observations from assumptions and agree a practical next step. Replace this preview with reviewed editorial content before release.','cover_url','','cover_alt','','source_name','','source_url','');
 perform public.website_news_admin('save',jsonb_build_object('id',fixture.id,'revision',0,'slug',fixture.slug,'document',doc));
 perform public.website_news_admin('publish',jsonb_build_object('id',fixture.id,'revision',1));
 end if;
 end loop;
end $$;
commit;
select 'Two explicitly labelled synthetic editorial previews prepared in staging.' as result;
