-- Change system-authored wording only. API names, admission routes and notification keys stay stable.
do $copy$
declare signature text;source text;before_source text;pair record;
begin
 foreach signature in array array['private_website_lab.market(text,jsonb)','private_website_lab.market_social(text,jsonb)','private_website_lab.validate_market_membership(public.website_project_team_members)'] loop
  source:=pg_get_functiondef(signature::regprocedure);before_source:=source;
  for pair in select * from (values
   ('A new reply to your Market post','A new reply to your Connect post'),
   ('A new reply to your Market comment','A new reply to your Connect comment'),
   ('You were mentioned in Lab Market','You were mentioned in Mettelo Connect'),
   ('You have a new Market message','You have a new Connect message'),
   ('Current Market collaboration required','Current Connect collaboration required'),
   ('Unsupported Market action','Unsupported Connect action'),
   ('Market membership must preserve its independent admission route','Connect membership must preserve its independent admission route')
  ) as copy(old_text,new_text) loop
   source:=replace(source,quote_literal(pair.old_text),quote_literal(pair.new_text));
  end loop;
  if source<>before_source then execute source;end if;
 end loop;
end $copy$;
