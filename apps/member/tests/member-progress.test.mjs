import test from 'node:test';
import assert from 'node:assert/strict';
import {memberProgress,progressCards} from '../lib/member-progress.mjs';
import {memberHome} from '../lib/member-home.mjs';
const card={team_id:'a',project_ref:'P1',title:'Project one',team_status:'active',membership_status:'confirmed',can_enter:true,lab_enabled:true};
const item={id:'task-a',kind:'task',owner_id:'me',author_id:'other',title:'Build the prototype',status:'in_progress',created_at:'2026-11-04T09:00:00Z'};
test('active projects are distinct accessible briefs, never offered/forming/completed placements',()=>{
 const cards=[card,{...card,team_id:'b'},{...card,team_id:'c',membership_status:'offered'},{...card,team_id:'d',can_enter:false},{...card,team_id:'e',team_status:'completed'},{...card,team_id:'f',team_status:'forming'}];
 assert.equal(memberProgress({cards,userId:'me'}).activeProjects,1);assert.equal(progressCards(cards).length,3);
});
test('next work belongs to the member in an accessible active team',()=>{
 const cards=[card,{...card,team_id:'done',team_status:'completed'},{...card,team_id:'hidden',can_enter:false}];
 const p=memberProgress({cards,userId:'me',workspaces:[{team_id:'a',items:[{...item,id:'other',owner_id:'someone'},item]},{team_id:'done',items:[{...item,id:'finished'}]},{team_id:'hidden',items:[{...item,id:'secret'}]}]});
 assert.equal(p.next.item.id,'task-a');assert.match(memberHome({cards,progress:p}).primary.href,/a\?view=tasks#task-task-a$/);
});
test('offers retain priority over ongoing work and unaccepted milestones never become completed metrics',()=>{
 const p=memberProgress({cards:[card],userId:'me',workspaces:[{team_id:'a',items:[{...item,kind:'milestone'}]}]});
 const next=memberHome({cards:[card],progress:p});assert.equal(next.primary.badge,'Your next milestone');assert.match(next.primary.href,/view=plan#milestone-/);
 assert.equal(memberHome({cards:[card,{...card,team_id:'offer',membership_status:'offered'}],progress:p}).primary.kind,'offer');
});
test('blocked and awaiting-review work get honest instructions',()=>{
 for(const status of ['blocked','ready_for_review']){const p=memberProgress({cards:[card],userId:'me',workspaces:[{team_id:'a',items:[{...item,status}]}]});const home=memberHome({cards:[card],progress:p});assert.notEqual(home.primary.label,'Continue building');}
});
test('a failed source does not report a false zero',()=>{const p=memberProgress({cards:[card],labFailed:true,userId:'me'});assert.equal(p.activeProjects,null);assert.equal(p.unavailable,true);});
