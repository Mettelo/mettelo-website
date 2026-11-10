begin;
-- Narrow, owner-bound projection. Private notes and reviewer identity stay private.
create function private_website_lab.application_statuses() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified account required'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'status',coalesce(r.status,'new'))) from public.website_project_interests i left join private_website_lab.interest_reviews r on r.interest_id=i.id where i.user_id=actor),'[]'::jsonb);
end $$;
revoke all on function private_website_lab.application_statuses() from public,anon,authenticated;
grant execute on function private_website_lab.application_statuses() to authenticated;
create function public.website_application_statuses() returns jsonb
language sql stable security invoker set search_path='' as $$select private_website_lab.application_statuses()$$;
revoke all on function public.website_application_statuses() from public,anon,authenticated;
grant execute on function public.website_application_statuses() to authenticated;
commit;
