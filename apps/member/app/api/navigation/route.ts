import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie'};
/** Same-origin presentation endpoint. Never returns tokens, email or access roles. */
export async function GET(){
 try{const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();
 if(!user?.email_confirmed_at)return NextResponse.json({authenticated:false},{headers});
 const {data:profile}=await db.from('profiles').select('full_name,avatar_path').eq('id',user.id).maybeSingle();
 const photo=profile?.avatar_path?await db.storage.from('website-profile-photos').createSignedUrl(profile.avatar_path,300):null;
 return NextResponse.json({authenticated:true,name:profile?.full_name?.trim().split(/\s+/)[0]||'Member',avatar:photo?.data?.signedUrl||null},{headers});
 }catch{return NextResponse.json({authenticated:false},{status:503,headers});}
}
