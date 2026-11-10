import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectEmail,runProjectEmailPreviews,sampleProjectEmails} from '../lib/project-email-previews.mjs';
const jobs=sampleProjectEmails();
test('default preview runner makes no calls and cannot send',async()=>{assert.deepEqual(await runProjectEmailPreviews({rpc:()=>{throw Error('must not call');}}),{deliveryEnabled:false,previews:[]});});
test('all five events render plain text, HTML, stable keys and expected destinations',()=>{
 const mails=jobs.map(job=>projectEmail(job));assert.equal(new Set(mails.map(m=>m.idempotencyKey)).size,5);
 assert.match(mails[0].text,/does not reserve a place/);assert.match(mails[1].text,/accept or decline/);assert(!mails[1].text.includes('your Lab access is ready'));
 assert.match(mails[2].text,/clarification/);assert.match(mails[3].text,/not progressing/);assert.match(mails[4].html,/\/member\/lab\/11111111/);
 for(const mail of mails){assert(mail.html.includes('Mettelo Support'));assert(mail.text.includes('MTL-DA-001'));}
});
test('private notes and arbitrary input fields never appear in templates',()=>{
 for(const job of jobs){const mail=projectEmail({...job,note:'PRIVATE_REVIEW_SECRET',review_note:'OTHER_SECRET',reason:'INTERNAL_REASON',body:'PRIVATE_BODY'});for(const value of ['PRIVATE_REVIEW_SECRET','OTHER_SECRET','INTERNAL_REASON','PRIVATE_BODY']){assert(!mail.html.includes(value));assert(!mail.text.includes(value));}}
});
test('content is escaped and unapproved URLs, identities and states are rejected',()=>{
 const mail=projectEmail({...jobs[0],project_title:'<script>alert(1)</script>',team_label:'<img onerror=bad>'});assert(!mail.html.includes('<script>'));assert(!mail.html.includes('<img'));assert(mail.html.includes('&lt;script&gt;'));
 assert.throws(()=>projectEmail(jobs[0],{baseUrl:'https://untrusted.invalid'}));assert.throws(()=>projectEmail({...jobs[4],team_id:'../../admin'}));assert.throws(()=>projectEmail({...jobs[3],review_status:'shortlisted'}));assert.throws(()=>projectEmail({...jobs[0],kind:'send_password'}));
});
test('duplicate preview IDs do not produce duplicate drafts',async()=>{const result=await runProjectEmailPreviews({enabled:true,rpc:async()=>[...jobs,jobs[0]]});assert.equal(result.previews.length,5);assert.equal(result.deliveryEnabled,false);});
test('CLI default and explicit enabled flag never invoke delivery',()=>{
 const cwd=fileURLToPath(new URL('../',import.meta.url));const run=value=>spawnSync(process.execPath,['scripts/project-email-previews.mjs'],{cwd,encoding:'utf8',env:{...process.env,METTELO_PROJECT_EMAIL_ENABLED:value}});
 const disabled=run('false');assert.equal(disabled.status,0);assert.match(disabled.stdout,/No database or provider calls/);const enabled=run('true');assert.notEqual(enabled.status,0);assert.match(enabled.stderr,/disabled by design/);
});
