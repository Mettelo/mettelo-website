const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function projectEmail(job,{baseUrl='https://mettelo.com'}={}){
 const origin=new URL(baseUrl);
 if(!['https://staging.mettelo.com','https://mettelo.com','http://127.0.0.1:3001','http://localhost:3001'].includes(origin.origin)||origin.pathname!=='/'||origin.username||origin.password||origin.search||origin.hash)throw Error('Unapproved member origin');
 if((!/^[1-9]\d*$/.test(String(job.id))&&!uuid.test(String(job.id)))||!uuid.test(job.recipient_id)||!/^MTL-(?:(DA|DE|DS|AI|XF|BA)-\d{3}|MP-[A-F0-9]{12})$/.test(job.project_ref))throw Error('Invalid email event');
 let title,body,cta,path='/member/applications';
 switch(job.kind){
 case 'application_received':title='Application received';body='Your project application has been saved. The Mettelo team will review it and confirm the next step. Applying does not reserve a place.';cta='View your application';break;
 case 'offer_ready':title='Your project offer is ready';body='A place has been offered to you. Review the role, commitment and response deadline in your member space, then accept or decline. Lab access follows once the team and admission checks are complete.';cta='Review your offer';path='/member/lab';break;
 case 'clarification':if(job.review_status!=='clarification')throw Error('Invalid clarification');title='More information is needed';body='Your application needs clarification. Open your applications and contact Mettelo Support to confirm what information is needed.';cta='View your application';break;
 case 'decision':if(!['declined','withdrawn'].includes(job.review_status))throw Error('Invalid decision');title=job.review_status==='declined'?'An update on your application':'Your application is closed';body=job.review_status==='declined'?'Your application is not progressing for this project at this time. You can review its status or contact Mettelo Support if you have a question.':'This project application has been marked as withdrawn. If this was unexpected, contact Mettelo Support.';cta='View your application';break;
 case 'lab_ready':if(!uuid.test(job.team_id))throw Error('Invalid team');title='Your Lab is ready';body='Your project team is active and your Lab access is ready. Open your workspace to meet the team, review the plan and agree your next step.';cta='Enter your Lab';path='/member/lab/'+job.team_id;break;
 default:throw Error('Unsupported project email event');
 }
 if(job.kind==='offer_ready'){
  if(!job.offer_expires_at||!Number.isFinite(Date.parse(job.offer_expires_at)))throw Error('Offer deadline required');
  body+=' Respond by '+new Date(job.offer_expires_at).toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'})+' (UK time).';
  if(job.role)body+=' Offered role: '+String(job.role).slice(0,100)+'.';
  if(job.coordinator_nomination)body+=' You have also been nominated to coordinate; review the separate coordinator agreement with your offer.';
 }
 const projectTitle=String(job.project_title||job.project_ref).slice(0,200),team=job.team_label?String(job.team_label).slice(0,80):'';
 const url=origin.origin+path,support=origin.origin+'/member/enquiries';
 const subject=title+' · '+job.project_ref;
 const text=[title,projectTitle+' · '+job.project_ref,team,body,cta+': '+url,'Questions? Contact Mettelo Support: '+support].filter(Boolean).join('\n\n');
 const html='<div style="max-width:600px;margin:0 auto;background:#fcfaf5;color:#18202e;font:15px/1.75 Arial,sans-serif"><div style="background:#18202e;color:#f7efdd;padding:28px"><p style="font-size:12px;letter-spacing:2px;margin:0">METTELO</p><h1 style="font-size:27px;line-height:1.25;margin:16px 0 0">'+escape(title)+'</h1></div><div style="padding:28px;border:1px solid #e4dfd3"><p style="font-size:12px;color:#626b76">'+escape(job.project_ref)+(team?' · '+escape(team):'')+'</p><h2 style="font-size:19px;line-height:1.4">'+escape(projectTitle)+'</h2><p>'+escape(body)+'</p><p style="margin:28px 0"><a href="'+escape(url)+'" style="display:inline-block;background:#18202e;color:white;text-decoration:none;padding:14px 22px;border-radius:8px">'+escape(cta)+' →</a></p><p style="font-size:12px;color:#626b76">Questions? <a href="'+escape(support)+'" style="color:#626b76">Contact Mettelo Support</a>.</p></div></div>';
 return {subject,text,html,idempotencyKey:'project-email/'+job.id};
}
export async function runProjectEmailPreviews({rpc,enabled=false,baseUrl}={}){
 if(!enabled)return {deliveryEnabled:false,previews:[]};
 const jobs=await rpc();if(!Array.isArray(jobs))throw Error('Invalid email preview snapshot');
 const seen=new Set();const previews=jobs.map(job=>({job,mail:projectEmail(job,{baseUrl})})).filter(({mail})=>{if(seen.has(mail.idempotencyKey))return false;seen.add(mail.idempotencyKey);return true;});
 return {deliveryEnabled:false,previews};
}
export function sampleProjectEmails(){
 const common={recipient_id:'22222222-2222-4222-8222-222222222222',team_id:'11111111-1111-4111-8111-111111111111',project_ref:'MTL-DA-001',project_title:'Retail Banking Customer & Portfolio Intelligence',team_label:'Example team — fictional preview'};
 return ['application_received','offer_ready','clarification','decision','lab_ready'].map((kind,index)=>({...common,id:String(index+1),kind,offer_expires_at:'2026-11-14T17:00:00Z',review_status:kind==='clarification'?'clarification':kind==='decision'?'declined':null}));
}
