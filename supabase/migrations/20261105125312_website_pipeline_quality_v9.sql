begin;
do $upgrade$
declare body text;
begin
 body:=pg_get_functiondef('public.website_publish_opportunity_batch(uuid,jsonb)'::regprocedure);
 if strpos(body,'mettelo-occupations-v8')=0 then raise exception 'Unexpected publication version';end if;
 body:=replace(body,$old$or (row_data.classification_version='mettelo-occupations-v8' and ($old$,$new$or row_data.classification_version is distinct from 'mettelo-occupations-v9'
   or (row_data.classification_version='mettelo-occupations-v8' and ($new$);
 body:=replace(body,'mettelo-occupations-v8','mettelo-occupations-v9');
 execute body;
 body:=pg_get_functiondef('private_opportunity_pipeline.admin_control(text,jsonb)'::regprocedure);
 if strpos(body,'mettelo-occupations-v8')=0 then raise exception 'Unexpected admin version';end if;
 execute replace(body,'mettelo-occupations-v8','mettelo-occupations-v9');
end $upgrade$;
notify pgrst,'reload schema';
commit;
