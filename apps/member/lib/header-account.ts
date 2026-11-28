import 'server-only';
import {cache} from 'react';
import {createServerSupabaseClient} from './supabase/server';
import type {HeaderAccount} from '@/components/AccountMenu';
export const headerAccount=cache(async():Promise<HeaderAccount|null>=>{
 const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();if(!user?.email_confirmed_at)return null;
 const {data:profile}=await db.from('profiles').select('full_name,avatar_path').eq('id',user.id).maybeSingle();
 const photo=profile?.avatar_path?await db.storage.from('website-profile-photos').createSignedUrl(profile.avatar_path,300):null;
 const {data:permissions}=await db.rpc('website_admin_capabilities');
 const fullName=profile?.full_name?.trim()||'Member';return {name:fullName.split(/\s+/)[0],fullName,avatar:photo?.data?.signedUrl||null,administration:permissions?.operations===true||permissions?.news===true||permissions?.opportunities===true};
});
