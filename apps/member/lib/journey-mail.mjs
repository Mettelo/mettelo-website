import {projectEmail} from './project-email-previews.mjs';
const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const copy={
 delivery_test:['Mettelo staging email delivery test','This is the controlled delivery test you requested for your administrator inbox. It does not represent an application, offer or membership change.'],
 lab_status:['Your Lab status has changed','Your Lab has been paused or completed. Sign in to see its current status and the next steps available to you.'],
 placement_ended:['Your Lab placement has ended','Your project placement has changed. Review your current Labs or contact Support if this was unexpected.'],
 support_reply:['A reply to your Mettelo enquiry','Mettelo has replied to your private enquiry. Sign in to read the reply and respond.'],
 coordinator_nomination:['Please review your coordinator nomination','Review the responsibilities and accept or decline the nomination in your member space.'],
 collaboration_request:['A collaboration needs your response','Review the role, commitment and deadline before responding. Pending invitations and requests do not reserve Lab places.'],
 collaboration_decision:['Your collaboration has an update','Sign in to review the decision and your current access. The shared three-Lab policy and project permissions still apply.'],
 collaboration_removed:['Your collaboration access has ended','Review your current Labs or contact Support if this was unexpected.'],
 proposal_decision:['Your project proposal has an update','Sign in to see the decision and next action. Approval does not create or activate a Lab automatically.']
};
export function journeyEmail(job){
 if(!/^[0-9a-f-]{36}$/i.test(job.id||''))throw Error('Invalid delivery ID');
 let mail;
 if(['application_received','offer_ready','clarification','decision','lab_ready'].includes(job.kind))mail=projectEmail(job,{baseUrl:'https://staging.mettelo.com'});
 else{
  const words=copy[job.kind];if(!words)throw Error('Unsupported email event');
  if(typeof job.href!=='string'||!/^\/member(?:\/|\?|$)/.test(job.href)||/[\\\r\n]/.test(job.href))throw Error('Invalid private destination');
  const url=new URL(job.href,'https://staging.mettelo.com');if(url.origin!=='https://staging.mettelo.com')throw Error('Invalid origin');
  const [subject,body]=words;
  mail={subject,text:subject+'\n\n'+body+'\n\nOpen your member space: '+url.href,html:'<div style="max-width:600px;margin:auto;font:16px/1.7 Arial;color:#18202e;padding:28px;border:1px solid #e4dfd3"><p>METTELO · STAGING TEST</p><h1 style="font-size:26px">'+escape(subject)+'</h1><p>'+escape(body)+'</p><p><a href="'+escape(url.href)+'">Open your member space →</a></p><p>Private details are available only after sign-in.</p></div>'};
 }
 return {...mail,subject:'[Staging] '+mail.subject,idempotencyKey:'journey-email/'+job.id};
}
export function journeyMailConfiguration(env){return {ready:env.METTELO_MEMBER_ENVIRONMENT==='staging'&&env.NEXT_PUBLIC_SUPABASE_URL==='https://jxijdjmjuzslmjxolhjl.supabase.co'&&Boolean(env.RESEND_API_KEY)&&Boolean(env.METTELO_JOURNEY_EMAIL_FROM),adminOnly:true};}
export async function runJourneyMail({rpc,send,from,recipientEmail,limit=5}){
 if(!from||!recipientEmail)throw Error('Approved sender and administrator inbox required');
 const counts={sent:0,failed:0,unknown:0,skipped:0};
 for(let i=0;i<Math.min(10,Math.max(1,limit));i++){
  const job=await rpc('claim',{});if(!job)break;if(job.skipped){counts.skipped++;continue;}
  const lease={job_id:job.id,lease_id:job.lease_id};const current=await rpc('prepare',lease);if(!current||current.skipped){counts.skipped++;continue;}
  if(String(current.email).toLowerCase()!==recipientEmail.toLowerCase())throw Error('Administrator recipient mismatch; stopped');
  let mail;try{mail=journeyEmail(current);}catch{await rpc('complete',{...lease,state:'failed',error:'Email validation failed'});counts.failed++;continue;}
  let result;try{result=await send({from,to:[recipientEmail],subject:mail.subject,text:mail.text,html:mail.html},mail.idempotencyKey);}catch{result={state:'unknown',error:'Provider outcome uncertain; reconcile before retrying'};}
  if(!['sent','failed','unknown'].includes(result?.state)||(result.state==='sent'&&!result.provider_id))result={state:'unknown',error:'Provider outcome invalid; reconcile before retrying'};
  await rpc('complete',{...lease,...result});counts[result.state]++;
 }
 return {...counts,adminOnly:true};
}
export async function sendWithResend(body,idempotencyKey,{apiKey,fetcher=fetch}){
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 let data;try{data=await response.json();}catch{return {state:'unknown',error:'Unreadable provider response; reconcile before retrying'};}
 if(response.ok&&data.id)return {state:'sent',provider_id:data.id};
 return {state:[400,401,403,422,429].includes(response.status)?'failed':'unknown',error:'Provider HTTP '+response.status+'; review delivery status'};
}
