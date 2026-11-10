begin;
alter table private_website_lab.market_posts drop constraint market_posts_kind_check;
alter table private_website_lab.market_posts add constraint market_posts_kind_check check(kind in ('update','question','showcase','collaborators','idea','project','collaboration'));
do $patch$
declare src text;needle text:=$needle$p_payload->>'category'='seeking' and p.kind='collaborators'$needle$;
begin
 src:=pg_get_functiondef('private_website_lab.market_social(text,jsonb)'::regprocedure);
 if strpos(src,needle)=0 then raise exception 'Expected seeking filter missing';end if;
 execute replace(src,needle,$replacement$p_payload->>'category'='seeking' and p.kind in ('collaborators','collaboration')$replacement$);
end $patch$;
create function private_market_shares.conversation_with(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();cid uuid;display text;
begin
 if actor is null or not private_website_lab.account_allowed(actor) or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verified account access required' using errcode='42501';end if;
 if target is null or target=actor or private_website_lab.market_blocked(actor,target) or not private_website_lab.account_allowed(target) or not exists(select 1 from auth.users where id=target and email_confirmed_at is not null) then raise exception 'Member contact unavailable' using errcode='42501';end if;
 select id into cid from private_website_lab.market_conversations where member_a=least(actor,target) and member_b=greatest(actor,target);
 if cid is not null then return jsonb_build_object('conversation_id',cid);end if;
 if not exists(select 1 from private_website_lab.market_preferences where user_id=target and discoverable and contactable) then raise exception 'This member is not accepting new requests' using errcode='42501';end if;
 select coalesce(full_name,username,'Member') into display from public.profiles where id=target;
 return jsonb_build_object('member_id',target,'name',coalesce(display,'Member'));
end $$;
revoke all on function private_market_shares.conversation_with(uuid) from public,anon;
grant execute on function private_market_shares.conversation_with(uuid) to authenticated;
create function public.website_market_conversation_with(p_member_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private_market_shares.conversation_with(p_member_id);$$;
revoke all on function public.website_market_conversation_with(uuid) from public,anon;
grant execute on function public.website_market_conversation_with(uuid) to authenticated;
commit;
