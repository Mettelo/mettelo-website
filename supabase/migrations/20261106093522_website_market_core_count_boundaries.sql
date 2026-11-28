begin; do $adapt$ declare src text;begin
 src:=pg_get_viewdef('private_website_lab.admin_team_directory'::regclass,true);
 src:=replace(src,$old$website_project_team_members.status = 'confirmed'::text$old$,$new$website_project_team_members.status = 'confirmed'::text AND website_project_team_members.admission_route = 'core'::text$new$);
 src:=replace(src,$old$x.status = 'confirmed'::text$old$,$new$x.status = 'confirmed'::text AND x.admission_route = 'core'::text$new$);
 src:=replace(src,'AND website_project_team_members.external_access_revoked_at IS NULL','AND website_project_team_members.access_verified_at IS NOT NULL AND website_project_team_members.external_access_revoked_at IS NULL');
 execute 'create or replace view private_website_lab.admin_team_directory as '||src;
 src:=pg_get_functiondef('private_website_lab.control(text,jsonb)'::regprocedure);
 src:=replace(src,$old$'confirmed',(select count(*) from public.website_project_team_members x where x.team_id=t.id and x.status='confirmed')$old$,$new$'confirmed',(select count(*) from public.website_project_team_members x where x.team_id=t.id and x.status='confirmed' and x.admission_route='core')$new$);execute src;
 src:=pg_get_functiondef('private_website_lab.operations_before_participation_policy(text,jsonb)'::regprocedure);
 src:=replace(src,$old$jsonb_build_object('admission_route',m.admission_route$old$,$new$jsonb_build_object('collaborators',(select count(*) from public.website_project_team_members xm where xm.team_id=m.team_id and xm.admission_route='market' and xm.status='confirmed'),'admission_route',m.admission_route$new$);execute src;
 end $adapt$; commit;
