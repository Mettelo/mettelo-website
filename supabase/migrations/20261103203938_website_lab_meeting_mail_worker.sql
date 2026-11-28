begin;
create function private_website_lab.mail_worker(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare job private_website_lab.mail_outbox;e private_website_lab.meetings;t public.website_project_teams;email_address text;ready boolean;
begin
 if p_action='claim' then
  -- A crashed send has uncertain provider state and must not be blindly retried.
  update private_website_lab.mail_outbox set state='unknown',last_error='Delivery lease expired; reconcile with provider before retrying.' where state='sending' and lease_until<now();
  select * into job from private_website_lab.mail_outbox where state in ('pending','failed') and next_attempt_at<=now() and attempts<5 order by created_at for update skip locked limit 1;
  if job.id is null then return null;end if;
  select * into e from private_website_lab.meetings where id=job.meeting_id;
  select * into t from public.website_project_teams where id=e.team_id;
  ready:=e.revision=job.revision and (e.starts_at>now() or job.kind='cancelled') and t.status='active' and exists(select 1 from public.website_project_team_members where team_id=e.team_id and user_id=job.user_id and status='confirmed' and admitted_at is not null);
  if not ready then update private_website_lab.mail_outbox set state='skipped' where id=job.id;return jsonb_build_object('skipped',true);end if;
  update private_website_lab.mail_outbox set state='sending',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '3 minutes' where id=job.id returning * into job;
 elsif p_action='complete' then
  select * into job from private_website_lab.mail_outbox where id=(p_payload->>'job_id')::uuid and lease_id=(p_payload->>'lease_id')::uuid and state='sending' for update;
  if job.id is null then raise exception 'Delivery lease no longer owned';end if;
  if p_payload->>'state' not in ('sent','failed','unknown','skipped') or p_payload->>'state' is null then raise exception 'Invalid delivery state';end if;
  update private_website_lab.mail_outbox set state=p_payload->>'state',provider_id=nullif(p_payload->>'provider_id',''),last_error=left(p_payload->>'error',300),next_attempt_at=now()+make_interval(mins=>least(60,5*job.attempts)),lease_until=null where id=job.id;
  return '{"ok":true}';
 elsif p_action='prepare' then
  select * into job from private_website_lab.mail_outbox where id=(p_payload->>'job_id')::uuid and lease_id=(p_payload->>'lease_id')::uuid and state='sending' for update;
  if job.id is null then raise exception 'Delivery lease no longer owned';end if;
 else raise exception 'Unsupported mail action';end if;
 select * into e from private_website_lab.meetings where id=job.meeting_id;
 select * into t from public.website_project_teams where id=e.team_id;
 select email into email_address from auth.users where id=job.user_id;
 if e.revision<>job.revision or t.status<>'active' or not exists(select 1 from public.website_project_team_members where team_id=e.team_id and user_id=job.user_id and status='confirmed' and admitted_at is not null) then
  update private_website_lab.mail_outbox set state='skipped' where id=job.id;return jsonb_build_object('skipped',true);end if;
 return jsonb_build_object('id',job.id,'lease_id',job.lease_id,'email',email_address,'recipient_time_zone',(select i.answers->>'time_zone' from public.website_project_team_members m join public.website_project_interests i on i.id=m.interest_id where m.team_id=e.team_id and m.user_id=job.user_id),'kind',job.kind,'meeting',to_jsonb(e),'team_label',t.label,'project_ref',t.project_ref);
end $$;
revoke all on function private_website_lab.mail_worker(text,jsonb) from public,anon,authenticated;
grant usage on schema private_website_lab to service_role;
grant execute on function private_website_lab.mail_worker(text,jsonb) to service_role;
create function public.website_lab_mail_worker(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_website_lab.mail_worker(p_action,p_payload)$$;
revoke all on function public.website_lab_mail_worker(text,jsonb) from public,anon,authenticated;
grant execute on function public.website_lab_mail_worker(text,jsonb) to service_role;
commit;
