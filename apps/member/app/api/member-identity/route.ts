import {memberOrigin} from '@/lib/request-origin.mjs';
import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {validateUsername} from '@/lib/member-identity';
export async function POST(request:Request){
  if(request.headers.get('origin')!==memberOrigin())return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const db=await createServerSupabaseClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user||!user.email_confirmed_at)return NextResponse.json({error:'Verify your email and sign in first.'},{status:401});
  try{
    const body=await request.json();const value=validateUsername(String(body.username||''));
    if(!value.ok)return NextResponse.json({error:value.error},{status:400});
    const {data,error}=await db.rpc('claim_member_username',{p_username:value.username});
    if(error)return NextResponse.json({error:'Unable to save your username. Please try again.'},{status:503});
    const result=Array.isArray(data)?data[0]:data;
    if(!result?.success)return NextResponse.json({error:result?.code==='RATE_LIMITED'?'Please wait before trying again.':'That username is unavailable. Choose another.'},{status:result?.code==='RATE_LIMITED'?429:409});
    return NextResponse.json({identity:{username:result.claimed_username,member_id:result.claimed_member_id}});
  }catch{return NextResponse.json({error:'Enter a valid username.'},{status:400});}
}
