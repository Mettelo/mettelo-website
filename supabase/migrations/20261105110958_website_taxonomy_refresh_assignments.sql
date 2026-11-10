begin;
do $fix$ declare body text;before_text text;after_text text;begin
body:=pg_get_functiondef('public.website_publish_opportunity_batch(uuid,jsonb)'::regprocedure);
before_text:='role_family=excluded.role_family,role_category=excluded.role_category,classification_details=excluded.classification_details,classification_version=excluded.classification_version,';
after_text:='role_category=excluded.role_category,classification_details=excluded.classification_details,';
if strpos(body,before_text)=0 then raise exception 'Unexpected taxonomy refresh assignment';end if;
body:=replace(body,before_text,after_text);execute body;
end $fix$;
notify pgrst,'reload schema';
commit;
