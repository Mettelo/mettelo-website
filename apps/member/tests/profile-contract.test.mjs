import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProfilePatch,fillEmptyProfile} from '../lib/profile-contract.mjs';
test('partial profile edits preserve omitted fields and reject identity/public changes',()=>{
  assert.deepEqual(validateProfilePatch({bio:'  Updated bio  '}),{bio:'Updated bio'});
  for(const input of [{id:'another-user'},{username:'changed'},{is_public:true},{full_name:''},{bio:'x'.repeat(1001)},{professional_area:'unreviewed tally role'},{github_url:'javascript:alert(1)'},{portfolio_url:'https://user:password@example.com'}])assert.throws(()=>validateProfilePatch(input));
});
test('historical prefill fills only empty fields and excludes invalid and private fields',()=>{
  assert.deepEqual(fillEmptyProfile({full_name:'Existing Name',bio:''},{full_name:'Registration Name',bio:'Draft bio',linkedin_url:'not a url',email:'private@example.test',is_public:true}),{full_name:'Existing Name',bio:'Draft bio'});
});

test('project matching fields accept bounded details and reject invalid choices',()=>{
 const patch={skills:' SQL, Power BI ',technical_interests:'Data engineering',preferred_roles:'Analyst',weekly_availability:'2–4 hours',problem_interests:'Healthcare',community_contribution:'Peer reviews and documentation'};
 assert.equal(validateProfilePatch(patch).skills,'SQL, Power BI');
 for(const input of [{skills:'x'.repeat(401)},{technical_interests:[]},{preferred_roles:'x'.repeat(241)},{weekly_availability:'Every hour'},{problem_interests:'x'.repeat(401)},{community_contribution:'x'.repeat(1001)}])assert.throws(()=>validateProfilePatch(input));
 assert.deepEqual(validateProfilePatch({skills:''}),{skills:''});
});
