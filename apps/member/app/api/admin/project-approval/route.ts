import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401});
 const raw=await request.text();if(raw.length>8192)return NextResponse.json({error:'Request too large.'},{status:413});
 const fields=new URLSearchParams(raw),action=fields.get('action');
 if(!['approve','retry'].includes(action||'')||!/^[0-9a-f-]{36}$/i.test(fields.get('interest_id')||''))return NextResponse.json({error:'Choose a valid application and action.'},{status:400});
 const payload=Object.fromEntries(['interest_id','participation','role','team_id','reason'].map(key=>[key,fields.get(key)||'']));
 const {data,error}=await db.rpc('website_project_approval',{p_action:action,p_payload:payload});
 if(error)return NextResponse.json({error:error.code==='42501'?'Project administrator access required.':error.code==='P0001'?error.message:'The decision could not be saved. Refresh and try again.'},{status:error.code==='42501'?403:400});
 return NextResponse.json({ok:true,result:data});
}
