-- A starting coordinator and milestone owner must be among the committed members.
do $upgrade$
declare s text;
begin
 s:=pg_get_functiondef('private_website_lab.readiness(uuid)'::regprocedure);
 s:=replace(s,'and status=''confirmed'') and (t.participation','and status=''confirmed'' and commitment_confirmed_at is not null) and (t.participation');
 s:=replace(s,'and m.user_id=i.owner_id)','and m.user_id=i.owner_id and m.commitment_confirmed_at is not null)');
 execute s;
 s:=pg_get_functiondef('public.website_validate_pilot_team()'::regprocedure);
 s:=replace(s,'and admission_route=''core'' and status=''confirmed'') then raise exception ''A confirmed coordinator','and admission_route=''core'' and status=''confirmed'' and commitment_confirmed_at is not null) then raise exception ''A confirmed coordinator');
 s:=replace(s,'and m.status=''confirmed'')) then raise exception ''Assign a team member','and m.status=''confirmed'' and m.commitment_confirmed_at is not null)) then raise exception ''Assign a team member');
 execute s;
end $upgrade$;
