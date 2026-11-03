import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
import {validateProfilePatch} from '@/lib/profile-contract.mjs';

export async function PATCH(request:Request){
  if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const db=await createServerSupabaseClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user?.email_confirmed_at)return NextResponse.json({error:'Verify your email and sign in first.'},{status:401});
  let body;
  try{
    const text=await request.text();
    if(text.length>24000)return NextResponse.json({error:'Profile request is too large.'},{status:413});
    body=JSON.parse(text);
    if(!Number.isSafeInteger(body.expected_version)||body.expected_version<0||typeof body.use_prefill!=='boolean')throw new Error('Reload your profile before saving.');
    body.patch=validateProfilePatch(body.patch);
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Enter valid profile details.'},{status:400});}
  const {data,error}=await db.rpc('save_website_profile',{p_patch:body.patch,p_expected_version:body.expected_version,p_use_prefill:body.use_prefill});
  if(error){
    if(error.code==='40001')return NextResponse.json({error:'Your profile or registration changed in another session. Your edits are still here. Reload before saving again.',code:'PROFILE_STALE'},{status:409});
    if(error.code==='22023')return NextResponse.json({error:'Check the profile details and try again.'},{status:400});
    return NextResponse.json({error:'Your profile could not be saved. Your edits are still here; please try again.'},{status:503});
  }
  return NextResponse.json({profile:Array.isArray(data)?data[0]:data},{headers:{'Cache-Control':'private, no-store'}});
}
