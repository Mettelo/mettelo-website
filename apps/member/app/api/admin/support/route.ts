import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return reply({error:'Invalid origin'},403);
 const raw=await request.text();if(raw.length>2000)return reply({error:'Request too large'},413);
 let payload;try{payload=JSON.parse(raw);const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;if(!['member','public'].includes(payload.source)||!uuid.test(payload.id)||!(payload.assigned_to===''||uuid.test(payload.assigned_to))||!Number.isSafeInteger(payload.version)||payload.version<0)throw Error();}catch{return reply({error:'Invalid assignment'},400);}
 const {db,user}=await labSession();if(!user)return reply({error:'Sign in required'},401);
 const {data,error}=await db.rpc('website_admin_readiness',{p_action:'assign',p_payload:{source:payload.source,id:payload.id,assigned_to:payload.assigned_to,version:payload.version}});
 if(error)return reply({error:error.code==='40001'?'Assignment changed. Refresh before saving.':error.code==='42501'?'Operations administrator access required.':'Unable to assign. Refresh and choose an available staff member.'},error.code==='40001'?409:error.code==='42501'?403:400);
 return reply(data);
}
