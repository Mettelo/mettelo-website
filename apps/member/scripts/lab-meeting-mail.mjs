import {createClient} from '@supabase/supabase-js';
import {runMeetingMail} from '../lib/lab-mail-runner.mjs';
try{process.loadEnvFile('.env.lab-mail.local');}catch(error){if(error.code!=='ENOENT')throw error;}
if(process.env.METTELO_LAB_EMAIL_ENABLED!=='true'){console.log('Meeting email delivery is disabled. No jobs claimed or emails sent.');process.exit(0);}
const url=process.env.METTELO_LAB_SUPABASE_URL,key=process.env.METTELO_LAB_SERVICE_ROLE_KEY;
if(url!=='https://jxijdjmjuzslmjxolhjl.supabase.co'||!key)throw Error('Explicit staging project and server-only worker credential required. Production is refused.');
if(!process.env.RESEND_API_KEY)throw Error('A server-only Resend sending credential is required.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const rpc=async(action,payload)=>{const {data,error}=await db.rpc('website_lab_mail_worker',{p_action:action,p_payload:payload});if(error)throw Error('Meeting email queue operation failed.');return data;};
const send=async(body,idempotencyKey)=>{
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 let result;try{result=await response.json();}catch{return {state:'unknown',error:'Provider returned an unreadable response; reconcile before retrying.'};}
 if(response.ok&&result.id)return {state:'sent',provider_id:result.id};
 return {state:[400,401,403,422,429].includes(response.status)?'failed':'unknown',error:`Provider HTTP ${response.status}; ${response.status>=500?'reconcile before retrying':'review delivery configuration'}.`};
};
const result=await runMeetingMail({rpc,send,enabled:true,from:process.env.METTELO_LAB_EMAIL_FROM||'',allowedRecipients:(process.env.METTELO_LAB_EMAIL_ALLOWED_RECIPIENTS||'').split(',').filter(Boolean)});
console.log(JSON.stringify(result));
