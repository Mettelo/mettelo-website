-- Preserve the existing one-current-placement-per-project policy and admission locks.
-- Reject conflicts before INSERT and expose the reason only in the authorised inbox.
do $patch$
declare src text:=pg_get_functiondef('private_website_lab.market(text,jsonb)'::regprocedure);needle text;replacement text;
begin
 if strpos(src,'admission_blocker')>0 then raise exception 'Admission conflict patch already present';end if;
 needle:='r.created_at,b.title,coalesce(p.full_name,''Member'') member_name,';
 replacement:=needle||$sql$
 case when actor=r.member_id then t.coordinator_id else r.member_id end profile_member_id,
 case when actor=r.member_id then (select coalesce(pr.full_name,pr.username,'Lab coordinator') from public.profiles pr where pr.id=t.coordinator_id) else coalesce(p.full_name,'Member') end profile_name,
 case when r.state='pending' and exists(select 1 from public.website_project_team_members current_place where current_place.user_id=r.member_id and current_place.project_ref=t.project_ref and current_place.status in ('offered','confirmed')) then 'This member already has an offered or confirmed place for this project. A member can have only one current Lab placement per project. Contact Mettelo if a transfer is needed.' end admission_blocker,
$sql$;
 if strpos(src,needle)=0 then raise exception 'Inbox patch target missing';end if;src:=replace(src,needle,replacement);
 needle:='  if exists(select 1 from public.website_project_team_members where team_id=tid and user_id=target and status in (''offered'',''confirmed'')) then raise exception ''Member already has a place in this Lab'';end if;';
 replacement:=$sql$  if exists(select 1 from public.website_project_team_members current_place where current_place.user_id=target and current_place.project_ref=t.project_ref and current_place.status in ('offered','confirmed')) then raise exception 'This member already has an offered or confirmed place for this project. A member can have only one current Lab placement per project. Contact Mettelo if a transfer is needed.';end if;$sql$;
 if strpos(src,needle)=0 then raise exception 'Request patch target missing';end if;src:=replace(src,needle,replacement);
 needle:='   perform private_website_lab.assert_participation_slot(target,tid);';
 if strpos(src,needle)=0 then raise exception 'Admission patch target missing';end if;
 src:=replace(src,needle,' '||replacement||E'\n'||needle);
 execute src;
end $patch$;
