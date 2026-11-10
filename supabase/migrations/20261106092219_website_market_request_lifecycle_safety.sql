begin;
do $adapt$ declare src text; begin
 src:=pg_get_functiondef('private_website_lab.market_leader(uuid,uuid)'::regprocedure);
 src:=replace(src,'and t.lab_enabled and m.admission_route',$new$and t.lab_enabled and (t.participation='solo' or t.coordinator_agreed_at is not null) and m.admission_route$new$);execute src;
 src:=pg_get_functiondef('public.website_validate_pilot_member()'::regprocedure);
 src:=replace(src,'or new.market_request_id is distinct from old.market_request_id',$new$or (new.market_request_id is distinct from old.market_request_id and not (old.admission_route='market' and old.status='left' and old.admitted_at is null and (old.access_verified_at is null or old.external_access_revoked_at is not null)))$new$);execute src;
 src:=pg_get_functiondef('private_website_lab.market(text,jsonb)'::regprocedure);
 src:=replace(src,$old$if rid is not null then select * into r from private_website_lab.market_requests where id=rid;tid:=r.team_id;target:=r.member_id;end if;$old$,$new$if p_action='request' then target:=actor;end if;
 if rid is not null then select * into r from private_website_lab.market_requests where id=rid;tid:=r.team_id;target:=r.member_id;end if;$new$);
 src:=replace(src,$old$elsif p_action='recruitment' then$old$,$new$elsif p_action='recruitment' then
 if coalesce((p_payload->>'open')::boolean,false) and (jsonb_array_length(coalesce(p_payload->'roles','[]')) not between 1 and 30 or length(btrim(coalesce(p_payload->>'description',''))) not between 20 and 2000 or length(btrim(coalesce(p_payload->>'commitment',''))) not between 3 and 300) then raise exception 'Choose roles, a public description and an expected commitment before opening recruitment';end if;$new$);
 src:=replace(src,$old$update private_website_lab.market_requests set state='expired' where team_id=tid$old$,$new$if (select count(*) from private_website_lab.market_requests where initiated_by=actor and created_at>now()-interval '1 minute')>=5 or (select count(*) from private_website_lab.market_requests where initiated_by=actor and created_at>now()-interval '1 day')>=50 then raise exception 'Too many collaboration requests or invitations; please try again later';end if;
  update private_website_lab.market_requests set state='expired' where team_id=tid$new$);
 src:=replace(src,$old$now(),now(),now(),now(),'market',rid);$old$,$new$now(),now(),now(),now(),'market',rid)
   on conflict(team_id,user_id) do update set role=excluded.role,responsibilities=excluded.responsibilities,status='confirmed',acknowledged_at=now(),commitment_confirmed_at=now(),admitted_at=now(),onboarding_checked_at=now(),access_verified_at=null,access_verified_by=null,external_access_revoked_at=null,market_request_id=excluded.market_request_id
   where website_project_team_members.admission_route='market' and website_project_team_members.status='left' and website_project_team_members.admitted_at is null and (website_project_team_members.access_verified_at is null or website_project_team_members.external_access_revoked_at is not null);
   if not found then raise exception 'Complete the existing membership exit and required access revocation before rejoining';end if;$new$);
 execute src;
end $adapt$;
create index market_requests_sender_time on private_website_lab.market_requests(initiated_by,created_at desc);
commit;
