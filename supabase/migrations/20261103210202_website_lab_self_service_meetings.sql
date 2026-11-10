begin;
do $upgrade$
declare source text;
begin
 source:=pg_get_functiondef('private_website_lab.operations(text,jsonb)'::regprocedure);
 if strpos(source,'''can_schedule'',lead and t.status=''active''')=0 then raise exception 'Unexpected meeting permissions definition';end if;
 source:=replace(source,'lead:=admin or (member and t.coordinator_id=actor);','lead:=coalesce(admin or (member and t.coordinator_id=actor),false);');
 source:=replace(source,'''can_schedule'',lead and t.status=''active''','''can_schedule'',(admin or member) and t.status=''active''');
 source:=replace(source,'jsonb_agg(to_jsonb(x) order by x.starts_at)','jsonb_agg(to_jsonb(x)||jsonb_build_object(''can_manage'',coalesce((admin or x.organiser_id=actor or t.coordinator_id=actor) and t.status=''active'',false)) order by x.starts_at)');
 source:=replace(source,'if not lead or t.status<>''active'' then raise exception ''Active project owner/coordinator required'' using errcode=''42501'';end if;','if not (admin or member) or t.status<>''active'' then raise exception ''An active team member is required to schedule a meeting'' using errcode=''42501'';end if;');
 source:=replace(source,'if e.id is null then raise exception ''Meeting not found'';end if;','if e.id is null then raise exception ''Meeting not found'';end if; if not lead and e.organiser_id<>actor then raise exception ''Only the organiser or coordinator can change this meeting'' using errcode=''42501'';end if;');
 source:=replace(source,'''created_at'',x.created_at) order by x.updated_at','''created_at'',x.created_at,''updated_at'',x.updated_at) order by x.updated_at');
 source:=replace(source,'update private_website_lab.support_cases set updated_at=now() where id=cid;','update private_website_lab.support_cases set updated_at=now(),status=case when c.reporter_id=actor and c.status=''waiting_for_member'' and coalesce(p_payload->>''internal'',''false'')<>''true'' then ''in_review'' else status end where id=cid;');
 execute source;
end $upgrade$;
commit;
