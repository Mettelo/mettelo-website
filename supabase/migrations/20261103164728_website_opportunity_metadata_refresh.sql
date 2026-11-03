begin;
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.website_publish_opportunity_batch(uuid,jsonb)'::regprocedure) into definition;
 if position('title=excluded.title,organisation=excluded.organisation,summary=excluded.summary,' in definition)=0 then raise exception 'Unexpected publication definition';end if;
 definition:=replace(definition,'title=excluded.title,organisation=excluded.organisation,summary=excluded.summary,','title=excluded.title,organisation=excluded.organisation,summary=excluded.summary,opportunity_type=excluded.opportunity_type,role_family=excluded.role_family,classification_version=excluded.classification_version,');
 execute definition;
end;$migration$;
commit;
