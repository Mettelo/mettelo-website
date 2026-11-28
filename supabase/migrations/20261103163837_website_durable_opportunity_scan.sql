begin;
create table private_opportunity_pipeline.scan_checkpoints(
 name text primary key check(name='workhub'), state jsonb, revision bigint not null default 0,
 lease_token uuid, lease_until timestamptz, updated_at timestamptz not null default now(),last_error text
);
alter table private_opportunity_pipeline.scan_checkpoints enable row level security;
revoke all on private_opportunity_pipeline.scan_checkpoints from public,anon,authenticated;
create function private_opportunity_pipeline.scan_control(p_action text,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item private_opportunity_pipeline.scan_checkpoints; token uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' and (actor is null or not exists(
  select 1 from private_opportunity_pipeline.admins a join auth.users u on u.id=a.user_id
  where a.user_id=actor and u.email_confirmed_at is not null
 )) then raise exception 'Administrator access required' using errcode='42501';end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>5000000 then raise exception 'Invalid scan request';end if;
 insert into private_opportunity_pipeline.scan_checkpoints(name) values('workhub') on conflict do nothing;
 select * into item from private_opportunity_pipeline.scan_checkpoints where name='workhub' for update;
 if p_action='read' then return jsonb_build_object('state',item.state,'revision',item.revision,'running',coalesce(item.lease_until>now(),false),'lastError',item.last_error);end if;
 if p_action='claim' then
  if item.lease_until>now() then raise exception 'A scan batch is already running' using errcode='55P03';end if;
  token:=gen_random_uuid();
  update private_opportunity_pipeline.scan_checkpoints set lease_token=token,lease_until=now()+interval '90 seconds' where name='workhub';
  return jsonb_build_object('state',item.state,'revision',item.revision,'token',token);
 end if;
 if p_action='commit' and (p_payload->>'revision')::bigint=item.revision-1
   and item.lease_token=(p_payload->>'token')::uuid and item.lease_until is null then
  if item.state is distinct from p_payload->'state' then raise exception 'Scan replay conflict';end if;
  return jsonb_build_object('saved',true,'revision',item.revision);
 end if;
 if item.lease_token is distinct from (p_payload->>'token')::uuid or item.lease_token is null
  or item.lease_until is null or item.lease_until<=now() or item.revision is distinct from (p_payload->>'revision')::bigint then
  raise exception 'Scan lease expired or revision changed' using errcode='40001';
 end if;
 if p_action='commit' then
  if jsonb_typeof(p_payload->'state') is distinct from 'object'
   or p_payload->'state'->>'version' is distinct from '1'
   or jsonb_typeof(p_payload->'state'->'jobs') is distinct from 'array'
   or jsonb_array_length(p_payload->'state'->'jobs')>2000
   or jsonb_typeof(p_payload->'state'->'pages') is distinct from 'array' then raise exception 'Invalid scan state';end if;
  update private_opportunity_pipeline.scan_checkpoints set state=p_payload->'state',revision=revision+1,
   lease_until=null,updated_at=now(),last_error=null where name='workhub';
  insert into private_opportunity_pipeline.admin_audit(actor,action,detail)
   select actor,'scan_commit',jsonb_build_object('pages',jsonb_array_length(p_payload->'state'->'pages'),'jobs',jsonb_array_length(p_payload->'state'->'jobs')) where actor is not null;
  return jsonb_build_object('saved',true,'revision',item.revision+1);
 elsif p_action='release' then
  update private_opportunity_pipeline.scan_checkpoints set lease_token=null,lease_until=null,last_error=left(coalesce(p_payload->>'error','Batch did not finish'),300) where name='workhub';
  return jsonb_build_object('released',true);
 end if;
 raise exception 'Unknown scan action';
end;$$;
revoke all on function private_opportunity_pipeline.scan_control(text,jsonb) from public,anon,authenticated,service_role;
grant usage on schema private_opportunity_pipeline to authenticated,service_role;
grant execute on function private_opportunity_pipeline.scan_control(text,jsonb) to authenticated,service_role;
create function public.website_opportunity_scan(p_action text,p_payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$
 select private_opportunity_pipeline.scan_control(p_action,p_payload);
$$;
revoke all on function public.website_opportunity_scan(text,jsonb) from public,anon;
grant execute on function public.website_opportunity_scan(text,jsonb) to authenticated,service_role;
commit;
