import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyEmail,journeyMailConfiguration,runJourneyMail,sendWithResend} from '../lib/journey-mail.mjs';
const id='11111111-1111-4111-8111-111111111111';
const job={id,kind:'support_reply',email:'admin@example.test',href:'/member/enquiries/'+id};
test('private email contains no reply body or reviewer notes and only approved destinations',()=>{
 const mail=journeyEmail({...job,body:'SECRET_REPLY',note:'SECRET_NOTE'});assert.doesNotMatch(mail.html,/SECRET/);assert.match(mail.text,/https:\/\/staging.mettelo.com\/member\/enquiries\//);assert.equal(mail.idempotencyKey,'journey-email/'+id);
 for(const href of ['//evil.test','https://evil.test','/member\\evil.test','/member\nfoo'])assert.throws(()=>journeyEmail({...job,href}));
});
test('staging configuration refuses production and missing sender',()=>{
 const config={METTELO_MEMBER_ENVIRONMENT:'staging',NEXT_PUBLIC_SUPABASE_URL:'https://jxijdjmjuzslmjxolhjl.supabase.co',RESEND_API_KEY:'test',METTELO_JOURNEY_EMAIL_FROM:'test@example.test'};
 assert.equal(journeyMailConfiguration(config).ready,true);assert.equal(journeyMailConfiguration({...config,METTELO_MEMBER_ENVIRONMENT:'production'}).ready,false);assert.equal(journeyMailConfiguration({...config,METTELO_JOURNEY_EMAIL_FROM:''}).ready,false);
});
test('offers carry deadline, role and combined nomination, including newly published projects',()=>{
 const mail=journeyEmail({id,recipient_id:id,kind:'offer_ready',project_ref:'MTL-MP-ABCDEF123456',offer_expires_at:'2026-11-14T17:00:00Z',role:'Analyst',coordinator_nomination:true});assert.match(mail.text,/14 Nov 2026/);assert.match(mail.text,/Analyst/);assert.match(mail.text,/coordinator agreement/);
});
test('delivery prepares again immediately before send and preserves idempotency key',async()=>{
 const calls=[];let claimed=false;const rpc=async(action,payload)=>{calls.push(action);if(action==='claim'){if(claimed)return null;claimed=true;return{id,lease_id:id};}if(action==='prepare')return job;if(action==='complete'){assert.equal(payload.state,'sent');return{ok:true};}};
 const result=await runJourneyMail({rpc,from:'sender@example.test',recipientEmail:job.email,send:async(body,key)=>{assert.deepEqual(body.to,[job.email]);assert.equal(key,'journey-email/'+id);return{state:'sent',provider_id:'provider-id'};}});assert.equal(result.sent,1);assert.deepEqual(calls,['claim','prepare','complete','claim']);
});
test('recipient mismatch stops before sending',async()=>{
 let sent=false;await assert.rejects(runJourneyMail({rpc:async a=>a==='claim'?{id,lease_id:id}:job,from:'sender@example.test',recipientEmail:'other@example.test',send:async()=>{sent=true;}}),/mismatch/);assert.equal(sent,false);
});
test('revoked or obsolete event is skipped, unknown outcome is held',async()=>{
 for(const stale of [true,false]){let claimed=false,outcome;const result=await runJourneyMail({rpc:async(a,p)=>{if(a==='claim'){if(claimed)return null;claimed=true;return{id,lease_id:id};}if(a==='prepare')return stale?{skipped:true}:job;outcome=p;},from:'sender@example.test',recipientEmail:job.email,send:async()=>{throw Error('timeout');}});assert.equal(result[stale?'skipped':'unknown'],1);if(!stale)assert.equal(outcome.state,'unknown');}
});
test('Resend acceptance, refusal and ambiguous responses remain distinct',async()=>{
 for(const [status,body,state]of [[200,{id:'x'},'sent'],[429,{},'failed'],[500,{},'unknown'],[200,{},'unknown']])assert.equal((await sendWithResend({},'key',{apiKey:'test',fetcher:async()=>new Response(JSON.stringify(body),{status})})).state,state);
});
