import {memberOrigin} from '@/lib/request-origin.mjs';
import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
export async function POST(request:Request){
  const origin=memberOrigin();
  if(request.headers.get('origin')!==origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const db=await createServerSupabaseClient();
  const {error}=await db.auth.signOut();
  if(error)return NextResponse.json({error:'Sign out failed. Please try again.'},{status:503});
  return NextResponse.redirect(new URL('/signin',origin),303);
}
