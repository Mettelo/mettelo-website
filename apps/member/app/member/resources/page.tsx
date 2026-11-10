import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
// Keep old links working without a separate career-resource screen.
export default async function Resources(){
 const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/signin?next=%2Fmember%2Fresources');
 if(!user.email_confirmed_at)redirect('/auth/check-email');
 const website=publicWebsiteOrigin();
 redirect(website+'/start/#essentials');
}
