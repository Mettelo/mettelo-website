begin;
select set_config('test.contact_admin',(select user_id::text from private_website_lab.admins limit 1),true);
select set_config('test.contact_email','contact-'||gen_random_uuid()::text||'@example.invalid',true);
select set_config('test.contact_nonce',gen_random_uuid()::text,true);
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare payload jsonb; a jsonb; b jsonb;begin
 payload:=jsonb_build_object('nonce',current_setting('test.contact_nonce'),'name','Synthetic public contact','email',current_setting('test.contact_email'),'category','privacy','subject','Synthetic contact test','message','A synthetic public enquiry used only for a rolled-back test.','consent',true);
 a:=public.website_contact_submit(payload);b:=public.website_contact_submit(payload);
 if a<>b or a->>'reference' not like 'WEB-%' then raise exception 'Retry did not return the same safe reference';end if;
 if a ? 'email' or a ? 'id' then raise exception 'Public response leaked contact details';end if;
 begin perform public.website_contact_submit(payload||'{"consent":false}');raise exception 'Consent bypass';exception when invalid_parameter_value then null;end;
 begin perform public.website_contact_submit(payload||'{"subject":"A different message"}');raise exception 'Nonce conflict accepted';exception when invalid_parameter_value then null;end;
 perform public.website_contact_submit(payload||jsonb_build_object('nonce',gen_random_uuid()));perform public.website_contact_submit(payload||jsonb_build_object('nonce',gen_random_uuid()));
 begin perform public.website_contact_submit(payload||jsonb_build_object('nonce',gen_random_uuid()));raise exception 'Rate limit bypass' using errcode='XX000';exception when raise_exception then null;end;
 begin perform * from private_website_lab.public_contacts;raise exception 'Anonymous read allowed';exception when insufficient_privilege then null;end;
 begin perform public.website_contact_admin('list');raise exception 'Anonymous administration allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin
 begin perform public.website_contact_admin('list');raise exception 'Non-admin list allowed';exception when insufficient_privilege then null;end;
 begin perform * from private_website_lab.public_contact_notes;raise exception 'Member read allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.contact_admin'),true);
set local role authenticated;
do $$declare rows jsonb;cid uuid;detail jsonb;begin
 rows:=public.website_contact_admin('list');select (x->>'id')::uuid into cid from jsonb_array_elements(rows) x where x->>'subject'='Synthetic contact test' limit 1;
 if cid is null then raise exception 'Admin inbox missing public enquiry';end if;
 perform public.website_contact_admin('note',jsonb_build_object('id',cid,'body','Synthetic staff-only response record.'));
 perform public.website_contact_admin('update',jsonb_build_object('id',cid,'status','in_review'));
 detail:=public.website_contact_admin('case',jsonb_build_object('id',cid));
 if detail->'case'->>'status'<>'in_review' or jsonb_array_length(detail->'notes')<>1 or detail->'case' ? 'nonce' then raise exception 'Admin contact workflow failed';end if;
end $$;
reset role;
rollback;
