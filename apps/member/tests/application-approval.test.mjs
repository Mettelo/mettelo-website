import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationStatus} from '../lib/application-status.mjs';
import {formationCandidates,validateProposal} from '../lib/project-formation.mjs';
import {projectDirectoryFilters} from '../lib/project-directory.mjs';
import {journeyEmail} from '../lib/journey-mail.mjs';
test('approved waiting and blocked outcomes explain next steps without another application',()=>{
 assert.match(applicationStatus('approved_waiting').message,/awaiting team formation/);
 assert.match(applicationStatus('approved_blocked').message,/do not need to apply again/);
 assert.equal(applicationStatus('approved').label,'Approved');
 assert.equal(projectDirectoryFilters({section:'applications',review:'approved'}).review,'approved');
});
test('approved Flexible applicants use one saved route and legacy shortlists remain eligible',()=>{
 const approved={id:'approved',user_id:'approved',project_ref:'P',participation:'flexible',review_status:'approved',placement_route:'team',role:'Analyst',submitted_at:'2026-11-11',answers:{commitment_response:'yes',coordination_preference:'comfortable'}};
 const legacy={...approved,id:'legacy',user_id:'legacy',review_status:'shortlisted',placement_route:undefined};
 assert.deepEqual(formationCandidates([approved,legacy],[],'P','solo').map(i=>i.id),['legacy']);
 assert.deepEqual(formationCandidates([approved,legacy],[],'P','team').map(i=>i.id),['approved','legacy']);
 assert.match(validateProposal({members:[approved],arrangement:'solo',roles:{approved:['Analyst']}}),/arrangement/);
});
test('approval email uses a private destination and contains no operational or administrator notes',()=>{
 const mail=journeyEmail({id:'11111111-1111-4111-8111-111111111111',kind:'application_approved',href:'/member/lab',note:'PRIVATE REVIEW',placement_error:'PRIVATE DATABASE ERROR'});
 assert.match(mail.subject,/approved/);assert.match(mail.text,/https:\/\/staging.mettelo.com\/member\/lab/);
 assert.doesNotMatch(mail.text,/PRIVATE/);assert.doesNotMatch(mail.html,/PRIVATE/);
});
