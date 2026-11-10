// This development slice cannot connect to the occupied production project.
export function memberSupabaseConfiguration(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)throw new Error('Authentication is not configured.');
  const parsed=new URL(url);
  if(parsed.origin!=='https://jxijdjmjuzslmjxolhjl.supabase.co'&&!(parsed.protocol==='http:'&&['127.0.0.1','localhost'].includes(parsed.hostname)))throw new Error('This development app requires the isolated staging database.');
  return {url,key};
}
