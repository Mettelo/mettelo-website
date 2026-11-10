import {meetingEmail} from './lab-meetings.mjs';
export async function runMeetingMail({rpc,send,enabled=false,allowedRecipients=[],limit=10,from=''}){
 if(!enabled)return {disabled:true,processed:0};
 if(!from||!allowedRecipients.length)throw Error('A sender and controlled staging recipient allowlist are required.');
 const allowed=new Set(allowedRecipients.map(v=>v.trim().toLowerCase()));let processed=0;
 for(let n=0;n<Math.min(20,limit);n++){
  const job=await rpc('claim',{});if(!job)break;if(job.skipped)continue;
  const lease={job_id:job.id,lease_id:job.lease_id};
  const current=await rpc('prepare',lease);if(current?.skipped||!current)continue;
  if(!allowed.has(String(current.email).toLowerCase())){await rpc('complete',{...lease,state:'skipped',error:'Recipient is outside the controlled staging allowlist.'});continue;}
  let mail;try{mail=meetingEmail(current);}catch{await rpc('complete',{...lease,state:'failed',error:'Meeting email validation failed.'});continue;}
  let outcome;try{outcome=await send({from,to:[current.email],subject:mail.subject,text:mail.text,html:mail.html,attachments:[{filename:'meeting.ics',content:Buffer.from(mail.calendar).toString('base64')}]},mail.idempotencyKey);}catch{outcome={state:'unknown',error:'Provider response uncertain; reconcile before retrying.'};}
  await rpc('complete',{...lease,...outcome});processed++;
 }
 return {disabled:false,processed};
}
