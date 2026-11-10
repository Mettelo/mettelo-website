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

test('education background accepts optional bounded fields, supports clearing and preserves readiness',async()=>{
 const patch={education_qualification:' BSc ',education_institution:'Example University',education_subject:'Computing',education_period:'2020–2024',education_additional:'Other learning, 2025'};
 assert.equal(validateProfilePatch(patch).education_qualification,'BSc');assert.deepEqual(validateProfilePatch({education_subject:''}),{education_subject:''});
 for(const input of [{education_subject:'x'.repeat(161)},{education_institution:[]},{education_additional:'x'.repeat(1501)}])assert.throws(()=>validateProfilePatch(input));
 const {profileCompletion}=await import('../lib/profile-completion.mjs');assert.equal(profileCompletion(patch).percent,profileCompletion({}).percent);
});

test('multiple education and experience entries validate independently and preserve stable IDs',()=>{
 const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
 const patch=validateProfilePatch({education_entries:[{id,qualification:' BSc ',institution:'College'},{id:other,qualification:'MSc',institution:'University'}],experience_entries:[{id,title:' Analyst ',organisation:'Employer'}]});
 assert.equal(patch.education_entries.length,2);assert.equal(patch.education_entries[0].qualification,'BSc');assert.equal(patch.experience_entries[0].title,'Analyst');assert.deepEqual(validateProfilePatch({education_entries:[]}),{education_entries:[]});
 for(const value of [{},[{}],[{id,title:123}],[{id,title:'Role',is_verified:'true'}],[{id,title:'Role'},{id,title:'Duplicate'}],[{id,title:'x'.repeat(161)}],Array.from({length:21},()=>({id,title:'Role'}))])assert.throws(()=>validateProfilePatch({experience_entries:value}));
});
