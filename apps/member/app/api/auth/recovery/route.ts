import {NextResponse} from 'next/server';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
import {createServerSupabaseClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403,headers});
 try{
  if(Number(request.headers.get('content-length'))>1024)return NextResponse.json({error:'This reset link could not be read. Request a new email.'},{status:400,headers});
  const body=await request.json();
  if(typeof body.token_hash!=='string'||! /^[A-Za-z0-9_-]{32,256}$/.test(body.token_hash))return NextResponse.json({error:'This reset link is incomplete. Request a new email.'},{status:400,headers});
  const db=await createServerSupabaseClient();
  const {error}=await db.auth.verifyOtp({token_hash:body.token_hash,type:'recovery'});
  if(error){
   if(error.status===429)return NextResponse.json({error:'Too many attempts. Please wait before trying again.'},{status:429,headers});
   if(error.code==='otp_expired'||error.status===400||error.status===403)return NextResponse.json({error:'This reset link has expired or has already been used. Request a new reset email.'},{status:400,headers});
   return NextResponse.json({error:'We could not check this link right now. Please try again shortly.'},{status:503,headers});
  }
  return NextResponse.json({next:'/auth/update-password'},{headers});
 }catch{return NextResponse.json({error:'We could not check this link. Please try again or request a new email.'},{status:400,headers});}
}
