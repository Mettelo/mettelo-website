begin;
-- General enquiries use the same private records, replies, ownership and notifications.
alter table private_website_lab.support_cases alter column team_id drop not null;
alter table private_website_lab.support_cases add column client_nonce uuid;
create unique index support_case_submission on private_website_lab.support_cases(reporter_id,client_nonce) where client_nonce is not null;
alter table private_website_lab.support_cases drop constraint support_cases_category_check;
alter table private_website_lab.support_cases add constraint support_cases_category_check check(category in ('account','application','platform','scope','access','add_member','remove_member','coordinator','inactive_member','conduct','delivery','meeting','other'));
alter table private_website_lab.support_cases add constraint support_cases_context_check check(
 (team_id is null and category in ('account','application','platform','other')) or
 (team_id is not null and category in ('scope','access','add_member','remove_member','coordinator','inactive_member','conduct','delivery','meeting','other')));

do $upgrade$
declare definition text; before_create text; after_create text;
begin
 definition:=pg_get_functiondef('private_website_lab.operations(text,jsonb)'::regprocedure);
 if strpos(definition,'private_website_lab.permitted(actor,''operations'')')=0 then raise exception 'Unexpected support authority definition';end if;
 if strpos(definition,'from private_website_lab.support_cases x join public.website_project_teams tt')=0 then raise exception 'Unexpected enquiry list definition';end if;
 definition:=replace(definition,'from private_website_lab.support_cases x join public.website_project_teams tt','from private_website_lab.support_cases x left join public.website_project_teams tt');
 definition:=replace(definition,'''team_label'',tt.label,''project_ref'',tt.project_ref','''team_label'',coalesce(tt.label,''Member support''),''project_ref'',coalesce(tt.project_ref,''General enquiry'')');
 definition:=replace(definition,'if p_action=''support_list'' then','if not private_website_lab.account_allowed(actor) then raise exception ''Account access required'' using errcode=''42501'';end if; if p_action=''support_list'' then');
 before_create:=$old$   if t.id is null or not (admin or exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status in ('offered','confirmed'))) then raise exception 'A current placement is required to open a team enquiry' using errcode='42501';end if;
   insert into private_website_lab.support_cases(team_id,reporter_id,category,subject,description) values(tid,actor,p_payload->>'category',btrim(p_payload->>'subject'),btrim(p_payload->>'description')) returning id into cid;$old$;
 after_create:=$new$   if tid is not null and (t.id is null or not (admin or exists(select 1 from public.website_project_team_members where team_id=tid and user_id=actor and status in ('offered','confirmed')))) then raise exception 'A current placement is required to open a team enquiry' using errcode='42501';end if;
   if (tid is null and coalesce(p_payload->>'category','') not in ('account','application','platform','other')) or (tid is not null and coalesce(p_payload->>'category','') not in ('scope','access','add_member','remove_member','coordinator','inactive_member','conduct','delivery','meeting','other')) then raise exception 'Choose a topic matching your enquiry';end if;
   if coalesce(length(btrim(p_payload->>'subject')),0) not between 5 and 180 or coalesce(length(btrim(p_payload->>'description')),0) not between 20 and 5000 then raise exception 'Add a title of 5–180 characters and a message of 20–5000 characters';end if;
   -- Serialise retries/rate checks per reporter, without trusting a supplied reporter ID.
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('member-support:'||actor::text,0));
   if nullif(p_payload->>'client_nonce','') is not null then
    select * into c from private_website_lab.support_cases where reporter_id=actor and client_nonce=(p_payload->>'client_nonce')::uuid;
    if c.id is not null then
     if c.team_id is distinct from tid or c.category is distinct from p_payload->>'category' or c.subject is distinct from btrim(p_payload->>'subject') or c.description is distinct from btrim(p_payload->>'description') then raise exception 'This submission was already used. Start a new enquiry';end if;
     return jsonb_build_object('ok',true,'case_id',c.id,'already_saved',true);
    end if;
   end if;
   if (select count(*) from private_website_lab.support_cases where reporter_id=actor and created_at>now()-interval '1 hour')>=5 then raise exception 'You have sent several enquiries. Please follow up in an existing conversation or try again later';end if;
   insert into private_website_lab.support_cases(team_id,reporter_id,category,subject,description,client_nonce) values(tid,actor,p_payload->>'category',btrim(p_payload->>'subject'),btrim(p_payload->>'description'),nullif(p_payload->>'client_nonce','')::uuid) returning id into cid;$new$;
 if strpos(definition,before_create)=0 then raise exception 'Unexpected support creation definition';end if;
 definition:=replace(definition,before_create,after_create);
 execute definition;
end $upgrade$;
notify pgrst,'reload schema';
commit;
