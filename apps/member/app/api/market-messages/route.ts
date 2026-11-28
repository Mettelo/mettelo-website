import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {communityRpc} from '@/lib/market-community';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const uuid=(s:string|null)=>!!s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export async function GET(request:Request){
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401,headers});
 const q=new URL(request.url).searchParams,member=q.get('member_id'),conversation=q.get('conversation_id'),before=q.get('before_at'),beforeId=q.get('before_id');
 if(member&&!uuid(member)||conversation&&!uuid(conversation)||before&&(!beforeId||!uuid(beforeId)||before.length>40||!Number.isFinite(Date.parse(before))))return NextResponse.json({error:'Invalid message selection.'},{status:400,headers});
 try{
  let cid=conversation;
  if(member){const {data,error}=await db.rpc('website_market_conversation_with',{p_member_id:member});if(error)throw error;cid=data.conversation_id;if(!cid)return NextResponse.json({user_id:user.id,request_target:{id:data.member_id,name:data.name}},{headers});}
  if(cid){const result=await communityRpc(db,'conversation',{conversation_id:cid,...(before?{before_at:before,before_id:beforeId}:{})});return NextResponse.json({user_id:user.id,conversation:result.conversation,messages:result.messages},{headers});}
  const page=Math.max(1,Math.min(100000,parseInt(q.get('page')||'1',10)||1)),result=await communityRpc(db,'conversations',{page});
  return NextResponse.json({user_id:user.id,rows:result.rows,page,more:result.rows.length===25},{headers});
 }catch{return NextResponse.json({error:'Messages are unavailable. Check your connection or current contact permission.'},{status:503,headers});}
}
