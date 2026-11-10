import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {marketRpc} from '@/lib/lab-market';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
const actions=new Set(['preferences','capacity','recruitment','request','invite','accept','decline','withdraw','remove']);
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(!origin||!profileRequestOriginAllowed(origin))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401});
 const raw=await request.text();if(raw.length>32768)return NextResponse.json({error:'Request too large.'},{status:413});
 const fields=new URLSearchParams(raw),action=fields.get('action')||'';
 if(!actions.has(action))return NextResponse.json({error:'Unsupported action.'},{status:400});
 const back=new URL('/member/market',origin);
 back.searchParams.set('tab',['projects','people','requests','manage'].includes(fields.get('return_tab')||'')?fields.get('return_tab')!:'requests');
 if(action==='preferences'&&fields.get('return_to')==='profile'){back.pathname='/member/profile';back.search='';back.hash='market-visibility';}
 const team=fields.get('team_id');if(back.searchParams.get('tab')==='manage'&&team&&/^[0-9a-f-]{36}$/i.test(team))back.searchParams.set('team',team);
 try{
  const payload:Record<string,unknown>=Object.fromEntries(['team_id','member_id','request_id','role','proposal','commitment','reason','description','capacity'].filter(key=>fields.has(key)).map(key=>[key,fields.get(key)]));
  if(action==='preferences'){for(const key of ['discoverable','contactable','share_details','share_location','notify_community','notify_messages'])payload[key]=fields.get(key)==='true';}
  if(action==='recruitment'){payload.open=fields.get('open')==='true';payload.roles=fields.getAll('roles');payload.skills=(fields.get('skills')||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,20);}
  if(action==='invite'&&fields.has('lab_role')){
   const choice=JSON.parse(fields.get('lab_role')!);if(typeof choice.team_id!=='string'||typeof choice.role!=='string')throw Error('Choose an advertised Lab role.');payload.team_id=choice.team_id;payload.role=choice.role;
  }
  const result=await marketRpc(db,action,payload);
  if(request.headers.get('accept')?.includes('application/json'))return NextResponse.json({ok:true,result});
  back.searchParams.set('notice',action==='preferences'?'Sharing preferences saved.':action==='accept'?'Collaboration accepted. Lab access is ready; external repository access is handled separately.':action==='remove'?'Collaboration access ended. Any required external revocation is tracked separately.':'Market update saved.');
 }catch(error){
  const e=error as {code?:string;message?:string};
  const message=e.code==='23505'?'A pending request or existing placement already exists. Reload to check it.':e.code==='42501'?'This action is not permitted for your current project role or account.':e.code==='P0001'?e.message:'The update could not be saved. Check the fields and try again.';
  if(request.headers.get('accept')?.includes('application/json'))return NextResponse.json({error:message},{status:e.code==='42501'?403:400});
  back.searchParams.set('error',(message||'Unable to save.').slice(0,400));
 }
 return NextResponse.redirect(back,303);
}
