-- Pending assignments are visible without becoming an offer, membership or slot.
do $patch$
declare source text;
begin
 source:=pg_get_functiondef('private_legacy_roster.claim_my_labs()'::regprocedure);
 source:=replace(source,'''can_enter'',m.status=''confirmed'' and m.admitted_at is not null and m.external_access_revoked_at is null and t.lab_enabled and t.status in (''active'',''completed'') and private_website_github.lab_ready(actor),',
 '''can_enter'',coalesce(m.status=''confirmed'' and m.admitted_at is not null and m.external_access_revoked_at is null and t.lab_enabled and t.status in (''active'',''completed'') and private_website_github.lab_ready(actor),false),');execute source;
end $patch$;

create or replace function private_website_lab.operations(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;claim jsonb;restored jsonb;unlinked jsonb;
begin
 if p_action in ('mine','participation_usage') then claim:=private_legacy_roster.claim_my_labs();end if;
 result:=private_website_lab.operations_before_existing_labs(p_action,p_payload);
 if p_action='mine' then
  select coalesce(jsonb_agg(case when m.admission_route='legacy' then x||jsonb_build_object('admission_route','legacy','legacy_source_status',a.recorded_status,'legacy_source_role',a.source->>'sourceRole','legacy_review',claim->'review','can_enter',m.status='confirmed' and m.admitted_at is not null and m.external_access_revoked_at is null and t.lab_enabled and t.status in ('active','completed') and private_website_github.lab_ready(auth.uid()),'commitment_confirmed',null,'is_nominee',false,'coordinator_agreed',null) else x end),'[]') into restored
  from jsonb_array_elements(result) x join public.website_project_team_members m on m.team_id=(x->>'team_id')::uuid and m.user_id=auth.uid()
  join public.website_project_teams t on t.id=m.team_id left join private_legacy_roster.memberships lm on lm.team_id=m.team_id and lm.user_id=m.user_id
  left join private_legacy_roster.allocations a on a.batch_key=lm.batch_key and a.source_row=lm.source_row;
  select coalesce(jsonb_agg(jsonb_build_object('team_id',x->'team_id','project_ref',x->'project_ref','title',x->'title','label',x->'label','participation',x->'participation','team_status',x->'team_status','admission_route','legacy','membership_status','pending','legacy_source_status',x->'source_status','legacy_source_role',x->'source_role','legacy_review',x->'review','can_enter',false,'lab_enabled',false,'role',x->'source_role','minimum',0,'confirmed',0,'access_verified',false,'two_person_proposed',false,'two_person_agreed',false)),'[]') into unlinked
  from jsonb_array_elements(claim->'assignments') x where not coalesce((x->>'linked')::boolean,false) and x->>'team_id' is not null;
  return restored||unlinked;
 end if;
 return result;
end $$;
revoke all on function private_website_lab.operations(text,jsonb) from public,anon;
grant execute on function private_website_lab.operations(text,jsonb) to authenticated;
