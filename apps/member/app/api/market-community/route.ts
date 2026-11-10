import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {communityRpc} from '@/lib/market-community';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
const actions=new Set(['publish','comment','like','bookmark','follow','delete_post','block','message_request','message_decision','message','report','resolve_report']);
const uuid=(s:string|null)=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)?s:null;
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||!profileRequestOriginAllowed(origin))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401});
 const raw=await request.text();if(raw.length>32768)return NextResponse.json({error:'Request too large.'},{status:413});
 const fields=new URLSearchParams(raw),action=fields.get('action')||'';
 if(!actions.has(action))return NextResponse.json({error:'Unsupported action.'},{status:400});
 const destination=['community','messages','moderation'].includes(fields.get('return_view')||'')?fields.get('return_view')!:'community';
 const back=new URL('/member/market/'+destination,origin);
 if(destination==='community'&&uuid(fields.get('post_id')))back.searchParams.set('post',fields.get('post_id')!);
 if(destination==='messages'&&uuid(fields.get('conversation_id')))back.searchParams.set('conversation',fields.get('conversation_id')!);
 try{
  const payload:Record<string,unknown>=Object.fromEntries(['member_id','post_id','conversation_id','comment_id','parent_id','report_id','target_id','team_id','project_ref','client_nonce','body','kind','reason'].filter(k=>fields.has(k)).map(k=>[k,fields.get(k)]));
  if(fields.has('enabled'))payload.enabled=fields.get('enabled')==='true';
  if(action==='publish')payload.topics=(fields.get('topics')||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,10);
  const result=await communityRpc(db,action,payload);
  if(request.headers.get('accept')?.includes('application/json'))return NextResponse.json({ok:true,result},{headers:{'Cache-Control':'private, no-store'}});
  if(result?.post_id&&destination==='community'&&['publish','comment'].includes(action))back.searchParams.set('post',result.post_id);
  if(action==='delete_post')back.searchParams.delete('post');
  if(result?.conversation_id&&destination==='messages')back.searchParams.set('conversation',result.conversation_id);
  back.searchParams.set('notice',action==='report'?'Report received for review.':action==='block'?'Contact preference updated.':'Saved.');
 }catch(error){const e=error as {code?:string;message?:string};const message=(e.code==='42501'?e.message||'This action is not permitted.':e.code==='P0001'?e.message||'Check your response.':'The update could not be saved. Check the fields and try again.').slice(0,400);if(request.headers.get('accept')?.includes('application/json'))return NextResponse.json({error:message},{status:e.code==='42501'?403:400,headers:{'Cache-Control':'private, no-store'}});back.searchParams.set('error',message);}
 return NextResponse.redirect(back,303);
}
