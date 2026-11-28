-- Keep invitation evidence across status checks; expired invitations need an explicit resend.
do $upgrade$
declare s text;
begin
 s:=pg_get_functiondef('private_website_github.snapshot(uuid)'::regprocedure);
 s:=replace(s,'''checked_at'',c.checked_at','''invitation_id'',c.invitation_id,''error_code'',c.last_error,''checked_at'',c.checked_at');execute s;
 s:=pg_get_functiondef('private_website_github.worker(text,jsonb)'::regprocedure);
 s:=replace(s,'invitation_id=nullif(payload->>''invitation_id'','''')::bigint','invitation_id=coalesce(nullif(payload->>''invitation_id'','''')::bigint,invitation_id)');execute s;
 s:=pg_get_functiondef('private_website_github.member(text,jsonb)'::regprocedure);
 s:=replace(s,'lease=case when private_website_github.connections.github_id<>excluded.github_id then null else private_website_github.connections.lease end,updated_at=now()',
 'lease=case when private_website_github.connections.github_id<>excluded.github_id then null else private_website_github.connections.lease end,invitation_id=case when private_website_github.connections.github_id<>excluded.github_id then null else private_website_github.connections.invitation_id end,last_error=case when private_website_github.connections.github_id<>excluded.github_id then null else private_website_github.connections.last_error end,updated_at=now()');execute s;
end $upgrade$;
