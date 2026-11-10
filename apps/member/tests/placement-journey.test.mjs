import test from 'node:test';
import assert from 'node:assert/strict';
import {placementJourney,labReadOnlyMessage} from '../lib/placement-journey.mjs';
const base={participation:'solo',membership_status:'offered',team_status:'forming',lab_enabled:false,can_enter:false};
test('Solo offers preserve official formation and explain separate post-activation collaboration',()=>{
 const j=placementJourney(base);assert.equal(j.status,'Solo placement offered');assert.match(j.arrangementNote,/official placement remains Solo/);assert.equal(j.canEnter,false);
});
test('Flexible preferences name the actual offer arrangement rather than a third placement type',()=>{
 for(const participation of ['solo','team']){const j=placementJourney({...base,participation,requested_participation:'flexible'});assert.match(j.preferenceNote,/Flexible preference/);assert.ok(j.preferenceNote.endsWith(participation==='solo'?'Solo.':'Team.'));}
});
test('accepted places expose actionable blockers rather than a second acceptance',()=>{
 const j=placementJourney({...base,membership_status:'confirmed',readiness:{checks:[{label:'Repository access checked',ready:false},{label:'Lab prepared',ready:true}]}});
 assert.equal(j.status,'Solo placement accepted');assert.match(j.note,/No second acceptance/);assert.deepEqual(j.pending,['Mettelo needs to verify repository access.']);
});
test('only admitted active or completed members get a workspace link',()=>{
 const card={...base,membership_status:'confirmed',lab_enabled:true,can_enter:true};
 for(const team_status of ['forming','paused'])assert.equal(placementJourney({...card,team_status}).canEnter,false);
 for(const team_status of ['active','completed'])assert.equal(placementJourney({...card,team_status}).canEnter,true);
 assert.equal(placementJourney({...card,team_status:'active',can_enter:undefined}).canEnter,false);
});
test('Chat distinguishes preparation, pause, completed work and staff previews',()=>{
 assert.match(labReadOnlyMessage({status:'forming',solo:true}),/being prepared/);
 assert.doesNotMatch(labReadOnlyMessage({status:'forming'}),/completed/);
 assert.match(labReadOnlyMessage({status:'paused'}),/paused/);
 assert.match(labReadOnlyMessage({status:'completed'}),/completed/);
 assert.match(labReadOnlyMessage({status:'active',isMember:false}),/Staff preview/);
});
