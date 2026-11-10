begin;
do $test$
declare actor uuid; target uuid; candidate text; payload jsonb; row jsonb; owners integer:=0; blocked boolean;
begin
 if has_function_privilege('anon','public.website_application_statuses()','execute') then raise exception 'Anonymous access granted';end if;
 for actor in select distinct user_id from public.website_project_interests loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  payload:=public.website_application_statuses();
  if jsonb_array_length(payload)<>(select count(*) from public.website_project_interests where user_id=actor) then raise exception 'Owner count mismatch';end if;
  for row in select value from jsonb_array_elements(payload) loop
   if not exists(select 1 from public.website_project_interests where id=(row->>'id')::uuid and user_id=actor) or (select count(*) from jsonb_object_keys(row))<>2 then raise exception 'Private/foreign projection';end if;
  end loop; owners:=owners+1;
 end loop;
 if owners<2 then raise exception 'Multiple owners required';end if;
 select i.user_id,i.id into actor,target from public.website_project_interests i join auth.users u on u.id=i.user_id where u.email_confirmed_at is not null limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 foreach candidate in array array['new','clarification','shortlisted','declined','withdrawn'] loop
  insert into private_website_lab.interest_reviews(interest_id,status,note,reviewer_id) values(target,candidate,'PRIVATE QA NOTE MUST NOT LEAK',actor)
  on conflict(interest_id) do update set status=excluded.status,note=excluded.note;
  payload:=public.website_application_statuses();
  if not exists(select 1 from jsonb_array_elements(payload) x where x->>'id'=target::text and x->>'status'=candidate) or payload::text like '%PRIVATE QA%' then raise exception 'Incorrect state or private note leak';end if;
 end loop;
 perform set_config('request.jwt.claims','{}',true);blocked:=false;
 begin perform public.website_application_statuses(); exception when raise_exception then if sqlerrm='Verified account required' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Missing identity allowed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-0000-0000-000000000001','role','authenticated')::text,true);blocked:=false;
 begin perform public.website_application_statuses(); exception when raise_exception then if sqlerrm='Verified account required' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Unknown identity allowed';end if;
end $test$;
select 'PASS: owner isolation, five statuses, exact safe projection, anonymous privilege denial, missing/unknown identity guards; all writes rolled back' as result;
rollback;
