begin;
do $upgrade$
declare source text;marker text:='elsif p_action=''outbox_retry'' then';
begin
 source:=pg_get_functiondef('private_website_lab.operations(text,jsonb)'::regprocedure);
 if strpos(source,marker)=0 then raise exception 'Unexpected operations definition';end if;
 source:=replace(source,marker,$branch$
 elsif p_action='outbox_reconcile' then
  if not admin then raise exception 'Support administrator required' using errcode='42501';end if;
  reason:=btrim(coalesce(p_payload->>'reason',''));target:=p_payload->>'status';
  if p_payload->>'provider_reviewed' is distinct from 'true' or length(reason) not between 8 and 500 or target not in ('sent','failed') or target is null then raise exception 'Review provider logs and record a confirmed delivery outcome';end if;
  if target='sent' and coalesce(length(p_payload->>'provider_id'),0)<5 then raise exception 'Record the provider delivery ID';end if;
  update private_website_lab.mail_outbox set state=target,provider_id=nullif(p_payload->>'provider_id',''),last_error=reason,next_attempt_at=now(),lease_until=null where id=(p_payload->>'job_id')::uuid and state='unknown';
  if not found then raise exception 'Choose an uncertain delivery for reconciliation';end if;
  insert into private_website_lab.audit(actor_id,action,payload) values(actor,p_action,jsonb_build_object('job_id',p_payload->>'job_id','outcome',target,'reason',reason));
  return '{"ok":true}';
 elsif p_action='outbox_retry' then
 $branch$);
 source:=replace(source,'if t.status<>''active'' or m.status<>''confirmed'' or m.access_verified_at is null','if t.id is null or m.user_id is null or t.status<>''active'' or m.status<>''confirmed'' or m.access_verified_at is null');
 execute source;
end $upgrade$;
commit;
