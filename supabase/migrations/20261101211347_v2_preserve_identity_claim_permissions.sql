-- Preserve the canonical SECURITY INVOKER username RPC without reopening profile edits.
grant update(username,username_claimed_at,username_claim_attempted_at,updated_at) on public.profiles to authenticated;
