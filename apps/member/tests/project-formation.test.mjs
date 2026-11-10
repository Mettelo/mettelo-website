import test from 'node:test';
import assert from 'node:assert/strict';
import {formationCandidates,proposedGroups,validateProposal,coordination,proposalResponsibilities} from '../lib/project-formation.mjs';
const applicant=(id,participation='team',extra={})=>({id,user_id:id,project_ref:'P',participation,review_status:'shortlisted',role:'Analyst',submitted_at:'2026-11-01',answers:{commitment_response:'yes'},...extra});
test('suggestions require shortlisted unallocated applicants with matching arrangements and commitment',()=>{
 const people=[applicant('a'),applicant('b','flexible'),applicant('c','solo'),applicant('d','team',{review_status:'new'}),applicant('e','team',{answers:{commitment_response:'no'}}),applicant('f')];
 const teams=[{project_ref:'P',members:[{user_id:'f',status:'offered'}]}];
 assert.deepEqual(formationCandidates(people,teams,'P','team').map(i=>i.id),['a','b']);
 assert.deepEqual(formationCandidates(people,teams,'P','solo').map(i=>i.id),['b','c']);
});
test('Flexible preferences prioritise matching suggestions without inventing an allocation',()=>{
 const people=[applicant('a','flexible',{answers:{flexible_preference:'prefer_solo'}}),applicant('b','flexible',{answers:{flexible_preference:'prefer_team'}}),applicant('c')];
 assert.deepEqual(formationCandidates(people,[],'P','team').map(i=>i.id),['b','c','a']);
 const groups=proposedGroups(people,[],'P');assert.equal(groups.filter(g=>g.arrangement==='solo').length,2);assert.equal(groups.filter(g=>g.arrangement==='team').length,1);
});
test('a pending offer reserves a person only within the same project, while decline releases it',()=>{
 const a=applicant('a');assert.equal(formationCandidates([a],[{project_ref:'P',members:[{user_id:'a',status:'offered'}]}],'P','team').length,0);
 for(const t of [{project_ref:'Q',members:[{user_id:'a',status:'confirmed'}]},{project_ref:'P',members:[{user_id:'a',status:'declined'}]}])assert.equal(formationCandidates([a],[t],'P','team').length,1);
});
test('unknown legacy coordination is not interpreted as refusal, while explicit volunteers remain candidates',()=>{
 assert.equal(coordination(applicant('a')),'not_confirmed');assert.equal(coordination(applicant('a','team',{answers:{leadership_interest:true}})),'interested_with_support');
});
test('team confirmation requires distinct people, capacity, essential roles and a willing nominee',()=>{
 const members=[applicant('a','team',{answers:{coordination_preference:'comfortable'}}),applicant('b'),applicant('c')];
 const base={members,arrangement:'team',roles:{a:'Analyst',b:'Engineer',c:'Tester'},requiredRoles:['Analyst','Engineer'],nominee:'a',capacity:4};
 assert.equal(validateProposal(base),'');assert.match(validateProposal({...base,nominee:'b'}),/Nominate/);assert.match(validateProposal({...base,requiredRoles:['Designer']}),/Cover/);assert.match(validateProposal({...base,members:[members[0],members[0],members[2]]}),/once/);
});
test('solo has one owner and no coordinator requirement; a normal two-person group needs a reason',()=>{
 const a=applicant('a','flexible');assert.equal(validateProposal({members:[a],arrangement:'solo',roles:{a:'Analyst'},nominee:''}),'');
 const lead=applicant('l','team',{answers:{coordination_preference:'comfortable'}});const team={members:[lead,a],arrangement:'team',roles:{l:'Analyst',a:'Analyst'},nominee:'l'};
 assert.match(validateProposal(team),/three/);assert.equal(validateProposal({...team,twoPersonReason:'Supported small pilot with limited scope.'}),'');
});
test('solo owners automatically cover all selected essential responsibilities',()=>{
 const members=[applicant('a','solo')];
 assert.deepEqual(proposalResponsibilities('solo',['Analyst'],['Analyst','BI Developer']),['Analyst','BI Developer']);
 assert.equal(validateProposal({members,arrangement:'solo',roles:{a:[]},requiredRoles:['Analyst','BI Developer'],projectRoles:['Analyst','BI Developer'],nominee:''}),'');
});
test('one team member can cover several responsibilities without counting as extra people',()=>{
 const members=[applicant('a','team',{answers:{coordination_preference:'comfortable'}}),applicant('b'),applicant('c')];
 const base={members,arrangement:'team',roles:{a:['Analyst','BI Developer'],b:['Tester'],c:['Engineer']},requiredRoles:['Analyst','BI Developer'],projectRoles:['Analyst','BI Developer','Tester','Engineer'],nominee:'a'};
 assert.equal(validateProposal(base),'');
 assert.match(validateProposal({...base,members:members.slice(0,2)}),/three/);
 assert.match(validateProposal({...base,roles:{...base.roles,a:['Analyst']}}),/Cover/);
});
test('every selected team member needs a valid project responsibility',()=>{
 const members=[applicant('a','team',{answers:{coordination_preference:'comfortable'}}),applicant('b'),applicant('c')];
 const base={members,arrangement:'team',roles:{a:['Analyst'],b:['Engineer'],c:[]},projectRoles:['Analyst','Engineer'],nominee:'a'};
 assert.match(validateProposal(base),/at least one/);
 assert.match(validateProposal({...base,roles:{...base.roles,c:['Foreign role']}}),/this project/);
});
