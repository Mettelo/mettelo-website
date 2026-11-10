begin;
create table private_website_lab.market_proposals(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),
 title text not null default '' check(length(title)<=180),problem text not null default '' check(length(problem)<=2000),
 description text not null default '' check(length(description)<=5000),outcome text not null default '' check(length(outcome)<=2000),
 category text not null default '' check(length(category)<=120),skills text[] not null default '{}',
 participation text not null default 'flexible' check(participation in ('solo','team','flexible')),
 commitment text not null default '' check(length(commitment)<=300),milestones text not null default '' check(length(milestones)<=2000),
 collaboration text not null default '' check(length(collaboration)<=1000),supporting_url text not null default '' check(length(supporting_url)<=500),
 state text not null default 'draft' check(state in ('draft','submitted','under_review','changes_requested','approved','rejected')),
 version integer not null default 1,review_note text,reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 project_ref text unique references public.website_project_briefs(project_ref),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(cardinality(skills)<=20)
);
create index market_proposals_owner on private_website_lab.market_proposals(owner_id,updated_at desc,id);
create index market_proposals_queue on private_website_lab.market_proposals(state,created_at,id);
alter table private_website_lab.market_proposals enable row level security;
revoke all on private_website_lab.market_proposals from public,anon,authenticated;
create function private_website_lab.market_proposal(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid();pid uuid:=nullif(p_payload->>'proposal_id','')::uuid;ref text:=p_payload->>'project_ref';p private_website_lab.market_proposals;
 pg integer:=greatest(1,least(100000,coalesce((p_payload->>'page')::integer,1)));staff boolean;desired text:=p_payload->>'state';chosen_roles jsonb;newref text;seats integer;groups integer;rows jsonb;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) or not private_website_lab.account_allowed(actor) then raise exception 'Verified account access required' using errcode='42501';end if;
 staff:=private_website_lab.permitted(actor,'operations');
 if p_action in ('mine','queue','approved') then
  if p_action='queue' and not staff then raise exception 'Project administrator required' using errcode='42501';end if;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from(
   select p.id,p.title,p.category,p.skills,p.state,p.version,p.project_ref,p.updated_at,p.created_at
   from private_website_lab.market_proposals p
   where (p_action='mine' and p.owner_id=actor) or (p_action='queue' and p.state in ('submitted','under_review')) or (p_action='approved' and p.state='approved')
   order by p.created_at desc,p.id limit 25 offset (pg-1)*25
  )x;return jsonb_build_object('rows',rows,'page_size',25);
 elsif p_action='detail' then
  select * into p from private_website_lab.market_proposals where id=pid or (ref is not null and project_ref=ref);
  if p.id is null or (p.owner_id<>actor and not staff and p.state<>'approved') then raise exception 'Proposal unavailable' using errcode='42501';end if;
  -- Approved public projection excludes draft history, reviewer identity and private review notes.
  if p.owner_id<>actor and not staff then
   return jsonb_build_object('proposal',jsonb_build_object('id',p.id,'title',p.title,'problem',p.problem,'description',p.description,'outcome',p.outcome,'category',p.category,'skills',p.skills,'participation',p.participation,'commitment',p.commitment,'milestones',p.milestones,'collaboration',p.collaboration,'supporting_url',p.supporting_url,'state',p.state,'project_ref',p.project_ref),'can_review',false);
  end if;
  return jsonb_build_object('proposal',to_jsonb(p),'can_review',staff);
 end if;
 perform private_website_lab.participation_locks(array[actor]);
 if p_action='save' and pid is null then
  if (select count(*) from private_website_lab.market_proposals where owner_id=actor and created_at>now()-interval '1 day')>=5 then raise exception 'Proposal limit reached; try again tomorrow';end if;
  insert into private_website_lab.market_proposals(owner_id) values(actor) returning id into pid;
 end if;
 select * into p from private_website_lab.market_proposals where id=pid for update;
 if p.id is null then raise exception 'Proposal unavailable' using errcode='42501';end if;
 if p_action='save' and p_payload->>'version' is null and p.version=1 and p.title='' then null;
 elsif coalesce((p_payload->>'version')::integer,0)<>p.version then raise exception 'This proposal changed. Reload before saving';end if;
 if p_action in ('save','submit') then
  if p.owner_id<>actor or p.state not in ('draft','changes_requested') then raise exception 'Only the author may edit a draft or requested revision' using errcode='42501';end if;
  if p_action='save' then
   if coalesce(p_payload->>'supporting_url','')<>'' and (p_payload->>'supporting_url' !~ '^https://[^/@[:space:]]+([/:?#]|$)' or p_payload->>'supporting_url' ~ '^https://[^/]*@') then raise exception 'Use a public HTTPS supporting link without credentials';end if;
   update private_website_lab.market_proposals set title=btrim(coalesce(p_payload->>'title','')),problem=btrim(coalesce(p_payload->>'problem','')),description=btrim(coalesce(p_payload->>'description','')),outcome=btrim(coalesce(p_payload->>'outcome','')),category=btrim(coalesce(p_payload->>'category','')),skills=array(select left(btrim(s),80) from jsonb_array_elements_text(coalesce(p_payload->'skills','[]'))s),participation=coalesce(p_payload->>'participation','flexible'),commitment=btrim(coalesce(p_payload->>'commitment','')),milestones=btrim(coalesce(p_payload->>'milestones','')),collaboration=btrim(coalesce(p_payload->>'collaboration','')),supporting_url=btrim(coalesce(p_payload->>'supporting_url','')),version=version+1,updated_at=now() where id=pid;
  else
   if length(p.title)<5 or length(p.problem)<20 or length(p.description)<40 or length(p.outcome)<20 or length(p.category)<3 or cardinality(p.skills)<1 or length(p.commitment)<3 or length(p.milestones)<10 then raise exception 'Complete the title, problem, description, outcome, category, skills, commitment and milestones before submitting';end if;
   update private_website_lab.market_proposals set state='submitted',version=version+1,updated_at=now() where id=pid;
  end if;
 elsif p_action='review' then
  if not staff then raise exception 'Project administrator required' using errcode='42501';end if;
  if p.state not in ('submitted','under_review') or desired not in ('under_review','changes_requested','approved','rejected') then raise exception 'Choose a valid review transition';end if;
  if length(btrim(coalesce(p_payload->>'reason',''))) not between 8 and 2000 then raise exception 'Record the review reason';end if;
  if desired='approved' then
   chosen_roles:=p_payload->'roles';seats:=(p_payload->>'member_capacity')::integer;groups:=(p_payload->>'max_active_teams')::integer;
   if jsonb_typeof(chosen_roles) is distinct from 'array' or jsonb_array_length(chosen_roles) not between 1 and 12 or exists(select 1 from jsonb_array_elements_text(chosen_roles)s where length(btrim(s)) not between 2 and 100) or (select count(distinct s) from jsonb_array_elements_text(chosen_roles)s)<>jsonb_array_length(chosen_roles) then raise exception 'Approve between one and twelve distinct project roles';end if;
   if seats is null or seats not between 3 and 6 or groups is null or groups not between 1 and 25 then raise exception 'Set official member capacity (3–6) and active formations (1–25)';end if;
   newref:='MTL-MP-'||upper(left(replace(pid::text,'-',''),12));
   insert into public.website_project_briefs(project_ref,title,roles,intake_open) values(newref,p.title,chosen_roles,true);
   insert into public.website_project_pilot_settings(project_ref,max_active_teams,member_capacity) values(newref,groups,seats);
  end if;
  update private_website_lab.market_proposals set state=desired,project_ref=coalesce(newref,project_ref),review_note=btrim(p_payload->>'reason'),reviewed_by=actor,reviewed_at=now(),updated_at=now(),version=version+1 where id=pid;
  perform private_website_lab.notify_member(p.owner_id,'market-proposal:'||pid||':'||(p.version+1),'Your project proposal is '||replace(desired,'_',' '),'/member/market/proposals?proposal='||pid);
 else raise exception 'Unsupported proposal action';end if;
 insert into private_website_lab.audit(actor_id,action,payload) values(actor,'market_proposal_'||p_action,jsonb_build_object('proposal_id',pid,'previous_state',p.state,'state',desired,'project_ref',newref,'reason',left(p_payload->>'reason',2000)));
 return jsonb_build_object('ok',true,'proposal_id',pid,'project_ref',newref);
end $$;
revoke all on function private_website_lab.market_proposal(text,jsonb) from public,anon;
grant execute on function private_website_lab.market_proposal(text,jsonb) to authenticated;
create function public.website_market_proposals(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private_website_lab.market_proposal(p_action,p_payload) $$;
revoke all on function public.website_market_proposals(text,jsonb) from public,anon;
grant execute on function public.website_market_proposals(text,jsonb) to authenticated;
do $$declare src text;begin
 src:=pg_get_functiondef('private_website_lab.market(text,jsonb)'::regprocedure);
 src:=replace(src,$needle$'Mettelo project' origin$needle$,$replacement$case when exists(select 1 from private_website_lab.market_proposals p where p.project_ref=t.project_ref and p.state='approved') then 'Approved member project' else 'Mettelo project' end origin$replacement$);
 execute src;
end $$;
commit;
