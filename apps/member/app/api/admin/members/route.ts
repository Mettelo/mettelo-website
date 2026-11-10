import {memberManagementRequest} from '@/lib/member-management.mjs';
import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return response({error:'Request origin rejected.'},403);
 const {db,user}=await labSession();if(!user)return response({error:'Verified sign-in required.'},401);
 const raw=await request.text();if(raw.length>4096)return response({error:'Request too large.'},413);
 let body;try{body=JSON.parse(raw);}catch{return response({error:'Invalid request.'},400);}
 let parsed;try{parsed=memberManagementRequest(body);}catch(error){return response({error:(error as Error).message},400);}
 const {action,payload}=parsed;
 const {data,error}=await db.rpc('website_manage_members',{p_action:action,p_payload:payload});
 if(error)return response({error:error.code==='42501'?'Member administrator access required.':error.code==='P0001'?error.message:'The member record could not be loaded or updated. Refresh and try again.'},error.code==='42501'?403:400);
 return response({result:data});
}
