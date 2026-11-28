import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {proposalRpc} from '@/lib/market-proposals';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||!profileRequestOriginAllowed(origin))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401});
 const raw=await request.text();if(raw.length>32768)return NextResponse.json({error:'Request too large.'},{status:413});
 const fields=new URLSearchParams(raw),action=fields.get('action')||'';
 if(!['save','submit','review'].includes(action))return NextResponse.json({error:'Unsupported action.'},{status:400});
 const back=new URL('/member/market/proposals',origin);if(action==='review')back.searchParams.set('view','queue');
 const id=fields.get('proposal_id');if(id&&/^[0-9a-f-]{36}$/i.test(id))back.searchParams.set('proposal',id);
 try{
  const payload:Record<string,unknown>=Object.fromEntries(['proposal_id','version','title','problem','description','outcome','category','participation','commitment','milestones','collaboration','supporting_url','state','reason','member_capacity','max_active_teams'].filter(k=>fields.has(k)).map(k=>[k,fields.get(k)]));
  if(action==='save')payload.skills=(fields.get('skills')||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,20);
  if(action==='review')payload.roles=(fields.get('roles')||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,12);
  const result=await proposalRpc(db,action,payload);back.searchParams.set('proposal',result.proposal_id);back.searchParams.set('notice',action==='save'?'Draft saved. Review it before submitting.':action==='submit'?'Proposal submitted for official review.':'Review recorded. Approval does not activate a Lab or assign a leader.');
 }catch(error){const e=error as {code?:string;message?:string};back.searchParams.set('error',(e.code==='P0001'||e.code==='42501'?e.message||'This action is not permitted.':'The proposal could not be saved. Check the fields and try again.').slice(0,400));}
 return NextResponse.redirect(back,303);
}
