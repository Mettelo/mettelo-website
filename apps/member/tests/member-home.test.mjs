import test from 'node:test';
import assert from 'node:assert/strict';
import {memberHome} from '../lib/member-home.mjs';
const now=Date.parse('2026-11-04T12:00:00Z');
const active={team_id:'team-a',project_ref:'MTL-AI-010',title:'A real project',role:'AI Engineer',membership_status:'confirmed',team_status:'active',can_enter:true,lab_enabled:true,commitment_confirmed:true};
test('new members get profile guidance or project discovery without zero counters',()=>{
 assert.equal(memberHome({profilePercent:60}).primary.kind,'profile');
 const ready=memberHome({profilePercent:80});assert.equal(ready.primary.kind,'explore');assert.deepEqual(ready.facts,[]);
});
test('the earliest live offer takes precedence over active work and profile completion',()=>{
 const offer={...active,membership_status:'offered',team_id:'offer-a',offer_expires_at:'2026-11-05T12:00:00Z'};
 const earlier={...offer,team_id:'offer-b',offer_expires_at:'2026-11-05T09:00:00Z'};
 const result=memberHome({cards:[active,offer,earlier],profilePercent:10,now});assert.equal(result.primary.project.team_id,'offer-b');assert.equal(result.primary.href,'/member/lab');assert.equal(result.supporting[0].href,'/member/lab/team-a');
});
test('expired or invalid-dated offers never promise an available acceptance',()=>{
 for(const offer_expires_at of ['2026-11-03T12:00:00Z','invalid'])assert.equal(memberHome({cards:[{...active,membership_status:'offered',offer_expires_at}],now}).primary.kind,'placement');
});
test('confirmed responsibilities lead to existing review controls, without accepting on home',()=>{
 assert.equal(memberHome({cards:[{...active,commitment_confirmed:false}]}).primary.kind,'responsibility');
 assert.equal(memberHome({cards:[{...active,is_nominee:true,coordinator_agreed:false}]}).primary.kind,'responsibility');
 assert.equal(memberHome({cards:[{...active,team_status:'forming',two_person_proposed:true,two_person_agreed:false}]}).primary.kind,'responsibility');
});
test('active admitted work outranks old applications and an incomplete profile',()=>{
 const result=memberHome({cards:[active],applications:[{project_ref:'MTL-DA-001'}],profilePercent:10});assert.equal(result.primary.kind,'active');assert.equal(result.primary.href,'/member/lab/team-a');assert.equal(result.facts[0].label,'1 active Lab');
});
test('forming, paused and unadmitted placements cannot open a workspace',()=>{
 for(const patch of [{team_status:'forming'},{team_status:'paused'},{can_enter:false},{lab_enabled:false},{can_enter:undefined}]){const result=memberHome({cards:[{...active,...patch}]});assert.equal(result.primary.kind,'preparing');assert.equal(result.primary.href,'/member/lab');assert.ok(!result.facts.some(f=>f.label.includes('active')));}
});
test('submitted interest does not invent review progress or a team place',()=>{
 const result=memberHome({applications:[{project_ref:'MTL-DA-001'}],applicationCount:4,profilePercent:20});assert.equal(result.primary.kind,'applied');assert.equal(result.facts[0].label,'4 submitted applications');assert.equal(result.primary.project,null);
});
test('completed projects remain accessible without counting as active',()=>{
 const result=memberHome({cards:[{...active,team_status:'completed'}],applications:[{project_ref:active.project_ref}]});assert.equal(result.primary.kind,'completed');assert.ok(!result.facts.some(f=>f.label.includes('active')));
});
test('failed sources do not masquerade as empty activity or no application',()=>{
 assert.equal(memberHome({labFailed:true,profilePercent:100}).primary.kind,'unavailable');assert.equal(memberHome({applicationsFailed:true,profilePercent:100}).primary.kind,'unavailable');
 assert.equal(memberHome({cards:[active],applicationsFailed:true}).primary.kind,'active');
});
test('supporting activity is bounded and excludes the featured placement and its application',()=>{
 const result=memberHome({cards:[active,{...active,team_id:'team-b'},{...active,team_id:'team-c'},{...active,team_id:'team-d'}],applications:[{project_ref:active.project_ref}]});assert.equal(result.supporting.length,2);assert.ok(result.supporting.every(row=>row.href!=='/member/lab/team-a'));
});
