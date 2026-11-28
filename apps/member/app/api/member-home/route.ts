import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Sign in required'},{status:401,headers});const {data,error}=await db.rpc('website_member_home',{p_action:'notifications'});return error?NextResponse.json({error:'Notifications unavailable'},{status:503,headers}):NextResponse.json(data,{headers});}
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected'},{status:403,headers});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Sign in required'},{status:401,headers});
 const raw=await request.text();if(raw.length>4096)return NextResponse.json({error:'Request too large'},{status:413,headers});
 let body;try{body=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid request'},{status:400,headers});}
 if(!body||!['read','unread','read_all'].includes(body.action)||((body.action==='read'||body.action==='unread')&&!/^[0-9a-f-]{36}$/i.test(body.id||''))||(body.action==='read_all'&&!Number.isFinite(Date.parse(body.before))))return NextResponse.json({error:'Invalid notification action'},{status:400,headers});
 const {data,error}=await db.rpc('website_member_home',{p_action:body.action,p_payload:{id:body.id,before:body.before}});return error?NextResponse.json({error:'Could not update notifications'},{status:400,headers}):NextResponse.json(data,{headers});
}
