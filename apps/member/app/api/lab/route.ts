import {normaliseMeeting} from '@/lib/lab-meetings.mjs';
import {NextResponse} from 'next/server';
import {labSession,labRpc} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
const recognitionActions=new Set(['accept_milestone','confirm_delivery','record_skills']);
const actions=new Set(['accept_milestone','confirm_delivery','record_skills','respond','agree_two','create','offer','coordinator','verify_access','allow_two','start','prepare_workspace','add_item','assign_item','review_interest','form_group','nominate_coordinator','release_member','expire_offer','placement_status','reopen_preparation','project_capacity','confirm_commitment','agree_coordinator','admit_member','external_access_review','clear_restriction','support_create','support_reply','support_update','meeting_save','meeting_cancel','outbox_retry','outbox_reconcile']);
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401});
 const raw=await request.text();if(raw.length>65536)return NextResponse.json({error:'Request too large.'},{status:413});
 const fields=new URLSearchParams(raw);const action=fields.get('action')||'';
 if(!actions.has(action))return NextResponse.json({error:'Unsupported action.'},{status:400});
 const teamId=fields.get('team_id')||'';
 if((['add_item','assign_item'].includes(action)||recognitionActions.has(action))&&!/^[0-9a-f-]{36}$/i.test(teamId))return NextResponse.json({error:'Invalid team.'},{status:400});
 const destination=recognitionActions.has(action)?`/member/lab/${teamId}?view=${action==='accept_milestone'?'plan':'proof'}`:['add_item','assign_item'].includes(action)?`/member/lab/${teamId}`:['respond','agree_two','confirm_commitment','agree_coordinator'].includes(action)?'/member/lab':action.startsWith('support_')?'/member/enquiries':action.startsWith('meeting_')?`/member/lab/${teamId}?view=events`:'/admin/projects';
 const back=new URL(destination,request.headers.get('origin')!);
 try{
  const payload=Object.fromEntries(['note','evidence_id','skills','team_id','interest_id','user_id','project_ref','label','participation','role','reason','response','kind','title','body','url','owner_id','collaboration','item_id','review_status','nominee_id','offer_days','maximum_members','status','commitment_confirmed','two_person_exception','compatibility_reviewed','release_reason','keep_active','onboarding_confirmed','external_access_confirmed','category','subject','description','case_id','internal','meeting_id','expected_revision','topic','agenda','local_start','time_zone','duration','join_url','job_id','client_nonce','provider_reviewed','provider_id'].map(key=>[key,fields.get(key)||'']));
  let members;try{members=fields.has('members')?JSON.parse(fields.get('members')!):undefined;}catch{return NextResponse.json({error:'Invalid applicant selection.'},{status:400});}
  const meeting=action==='meeting_save'?normaliseMeeting(payload):{};
  const result=recognitionActions.has(action)?await (async()=>{const {data,error}=await db.rpc('website_member_home',{p_action:action,p_payload:payload});if(error)throw error;return data;})():await labRpc(db,action,{...payload,...meeting,...(members?{members}:{}),required_roles:fields.getAll('required_roles'),...(fields.has('responsibilities')?{responsibilities:fields.getAll('responsibilities')}:{})});
  if(request.headers.get('accept')?.includes('application/json'))return NextResponse.json({ok:true,result});
  if(result?.activation?.activated&&action==='respond'){back.pathname=`/member/lab/${teamId}`;back.search='';}
  back.searchParams.set('notice',result?.activation?.activated?'Your Lab is ready. You can begin your project work.':action==='respond'&&payload.response==='accept'?'Your place is accepted. No second acceptance is needed. Review any remaining setup steps below.':action==='respond'?'Your response has been saved.':'Project update saved.');
 }catch(error){
  const e=error as {code?:string;message?:string};
  const message=e.code==='23505'?'This member already has a current place in this project, or the team reference is already in use.':e.code==='42501'?'You do not have permission for this action. Check your placement or contact Mettelo.':e.code==='P0001'||(error instanceof Error&&action==='meeting_save')?e.message:'The update could not be saved. Refresh and try again.';
  if(request.headers.get('accept')?.includes('application/json'))return NextResponse.json({error:message},{status:e.code==='42501'?403:400});
  back.searchParams.set('error',(message||'Unable to save.').slice(0,200));
 }
 if(['add_item','assign_item'].includes(action)&&['home','plan','tasks','chat','data','proof','resources','team'].includes(fields.get('view')||''))back.searchParams.set('view',fields.get('view')!);
 return NextResponse.redirect(back,303);
}
