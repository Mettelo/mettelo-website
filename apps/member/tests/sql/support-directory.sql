begin;
create temp table support_results(check_name text,passed boolean);
do $test$
declare staff uuid;outsider uuid:=gen_random_uuid();token text:='SupportPage'||replace(gen_random_uuid()::text,'-','');r jsonb;before_metrics jsonb;ids text[]:='{}';page_ids text[];page_number integer;public_id uuid;denied boolean;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 perform set_config('request.jwt.claim.sub',staff::text,true);before_metrics:=public.website_support_directory('{"filter":"all"}')->'summary';
 insert into private_website_lab.public_contacts(nonce,name,email,category,subject,message,status)
 select gen_random_uuid(),token,'support-'||n||'@example.invalid',case when n<=20 then 'privacy' else 'general' end,token||' Public '||n,'Synthetic server pagination enquiry fixture only.',case when n<=55 then 'new' else 'resolved' end from generate_series(1,60)n;
 insert into private_website_lab.support_cases(reporter_id,category,subject,description,status,client_nonce)
 select staff,'other',token||' Member '||n,'Synthetic server pagination enquiry fixture only.',case when n<=5 then 'new' else 'resolved' end,gen_random_uuid() from generate_series(1,10)n;
 for page_number in 1..3 loop
  r:=public.website_support_directory(jsonb_build_object('filter','all','q',token,'page',page_number));
  assert r->>'total'='70' and jsonb_array_length(r->'rows')=case when page_number=3 then 20 else 25 end,'Incorrect server page/count';
  select array_agg(x->>'source'||':'||(x->>'id')) into page_ids from jsonb_array_elements(r->'rows')x;
  assert not page_ids&&ids,'Duplicate support record across pages';ids:=ids||page_ids;
  assert not exists(select 1 from jsonb_array_elements(r->'rows')x where x?'email' or x?'description' or x?'message' or x?'nonce' or x?'notes'),'Expanded private thread data returned in directory';
 end loop;
 assert cardinality(ids)=70,'Support traversal incomplete';
 r:=public.website_support_directory(jsonb_build_object('filter','all','q',token,'page',99999));assert r->>'page'='3','Stale page not clamped';
 insert into support_results values('70 mixed enquiries traverse25/25/20 stable pages without duplicate IDs or expanded private bodies',true);
 r:=public.website_support_directory(jsonb_build_object('filter','attention','q',token));assert r->>'total'='60','Status filter applied after pagination';
 assert (r->'summary'->>'attention')::int=(before_metrics->>'attention')::int+60,'Global attention count incorrect';
 r:=public.website_support_directory(jsonb_build_object('filter','all','q',token,'source','member'));assert r->>'total'='10','Source filtering incorrect';
 r:=public.website_support_directory(jsonb_build_object('filter','all','q',token,'topic','privacy'));assert r->>'total'='20','Topic filtering incorrect';
 select id into public_id from private_website_lab.public_contacts where name=token order by id limit 1;
 r:=public.website_support_directory(jsonb_build_object('filter','all','case_id',public_id));assert r->>'total'='1' and r->'rows'->0->>'id'=public_id::text,'Scoped detail summary incorrect';
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(outsider,'support-page-'||outsider||'@example.invalid',now(),'{"full_name":"Support pagination outsider"}');
 insert into private_website_lab.support_assignments(source,case_id,assigned_to,changed_by) values('public',public_id,outsider,staff);
 r:=public.website_support_directory(jsonb_build_object('filter','all','q',token,'ownership','unavailable'));assert r->>'total'='1' and r->'rows'->0->'ownership'->>'owner_available'='false','Unavailable owner filtering incorrect';
 insert into support_results values('Search, status, source, topic, owner and exact-case filters execute before paging; global counts remain accurate',true);
 perform set_config('request.jwt.claim.sub',outsider::text,true);denied:=false;begin perform public.website_support_directory();exception when insufficient_privilege then denied:=true;end;assert denied,'Ordinary member accessed staff directory';
 insert into private_website_lab.member_roles(user_id,role) values(outsider,'operations_admin');
 r:=public.website_support_directory(jsonb_build_object('filter','all','q',token));assert r->>'total'='70','Operations role lost permitted support access';
 update auth.users set banned_until=now()+interval '1 day' where id=outsider;
 denied:=false;begin perform public.website_support_directory();exception when insufficient_privilege then denied:=true;end;assert denied,'Retained identity bypassed account restriction';
 perform set_config('request.jwt.claim.sub','',true);denied:=false;begin perform public.website_support_directory();exception when insufficient_privilege then denied:=true;end;assert denied,'Anonymous staff directory allowed';
 assert not has_function_privilege('anon','public.website_support_directory(jsonb)','EXECUTE'),'Anonymous RPC grant exposed';
 insert into support_results values('Ordinary and anonymous users cannot access staff directory or its private data',true);
end $test$;
select * from support_results;
rollback;

