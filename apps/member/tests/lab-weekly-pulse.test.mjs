import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {weeklyPulseEmail,runWeeklyPulse} from '../lib/lab-weekly-pulse.mjs';
const job={team_id:'11111111-1111-4111-8111-111111111111',user_id:'22222222-2222-4222-8222-222222222222',week_start:'2026-11-02',project_ref:'MTL-DA-001',team_label:'Example team',period_start:'2026-10-26T00:00:00Z',period_end:'2026-11-02T00:00:00Z',tasks_completed:3,milestones_completed:1,next_milestone:'Build prototype',blockers:['Agree measures'],blocker_count:1};
test('disabled mode performs no database or delivery work',async()=>{
 const result=await runWeeklyPulse({rpc:()=>{throw Error('must not call');},send:()=>{throw Error('must not send');}});
 assert.deepEqual(result,{disabled:true,prepared:0,drafts:[]});
});
test('pulse contains real summary fields, a team-specific Lab link, and plain text',()=>{
 const mail=weeklyPulseEmail(job);assert.match(mail.text,/3 tasks completed · 1 milestone accepted/);assert.match(mail.text,/Build prototype/);assert.match(mail.text,/Agree measures/);assert.match(mail.html,/https:\/\/mettelo.com\/member\/lab\/11111111/);assert.match(mail.idempotencyKey,/2026-11-02/);
});
test('empty weeks do not invent accomplishments, milestones or blockers',()=>{
 const mail=weeklyPulseEmail({...job,tasks_completed:0,milestones_completed:0,next_milestone:null,blockers:[],blocker_count:0});
 assert.match(mail.text,/No completed tasks/);assert.match(mail.text,/No next milestone/);assert.match(mail.text,/No tasks are currently marked as blocked/);
});
test('workspace text is escaped and destinations cannot be replaced with external links',()=>{
 const mail=weeklyPulseEmail({...job,team_label:'<img src=x onerror=alert(1)>',next_milestone:'<script>bad</script>',blockers:['<a href="https://bad.invalid">bad</a>']});assert(!mail.html.includes('<script>'));assert(mail.html.includes('&lt;script&gt;'));assert(!mail.html.includes('<img'));
 assert.throws(()=>weeklyPulseEmail(job,{baseUrl:'https://bad.invalid'}));assert.throws(()=>weeklyPulseEmail({...job,team_id:'../../admin'}));assert.throws(()=>weeklyPulseEmail({...job,tasks_completed:-1}));
});
test('runner uses only preview/prepare and deduplicates identical recipient/team/week',async()=>{
 const calls=[];const rpc=async(action)=>{calls.push(action);return [job,job];};
 const preview=await runWeeklyPulse({rpc,mode:'preview'});assert.equal(preview.drafts.length,1);assert.equal(preview.prepared,0);assert.equal(preview.disabled,true);
 const prepare=await runWeeklyPulse({rpc,mode:'prepare'});assert.equal(prepare.prepared,1);assert.deepEqual(calls,['preview','prepare']);
 await assert.rejects(runWeeklyPulse({rpc,mode:'send'}));
 const next=weeklyPulseEmail({...job,week_start:'2026-11-09'});assert.notEqual(next.idempotencyKey,weeklyPulseEmail(job).idempotencyKey);
});
test('CLI defaults to no work and refuses live sending even if enabled in the environment',()=>{
 const cwd=fileURLToPath(new URL('../',import.meta.url));
 const disabled=spawnSync(process.execPath,['scripts/lab-weekly-pulse.mjs'],{cwd,encoding:'utf8',env:{...process.env,METTELO_WEEKLY_PULSE_EMAIL_ENABLED:'false'}});assert.equal(disabled.status,0);assert.match(disabled.stdout,/No database writes or emails sent/);
 const enabled=spawnSync(process.execPath,['scripts/lab-weekly-pulse.mjs'],{cwd,encoding:'utf8',env:{...process.env,METTELO_WEEKLY_PULSE_EMAIL_ENABLED:'true'}});assert.notEqual(enabled.status,0);assert.match(enabled.stderr,/not implemented or enabled/);
});
