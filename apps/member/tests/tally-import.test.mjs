import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTallyCsv,planTallyImport} from '../../../scripts/tally-profile-import.mjs';
const record=(id,email,extras={})=>({'Submission ID':id,'Email address':email,Country:'Test Country',City:'Test City','Tell us about yourself':'Synthetic biography',...extras});
test('Tally parser preserves multiline and quoted values and rejects malformed input',()=>{
  const headers='Submission ID,Email address,Country,City,Tell us about yourself\r\n';
  const result=parseTallyCsv('\uFEFF'+headers+'1,one@example.test,Country,City,"Hello, ""world""\nNext line"\r\n');
  assert.equal(result[0]['Tell us about yourself'],'Hello, "world"\nNext line');
  assert.throws(()=>parseTallyCsv(headers+'1,one@example.test,Country,City,"unfinished'));
});
test('duplicate emails are held for review, never latest-wins merged',()=>{
  const plan=planTallyImport([record('1',' ONE@example.test '),record('2','one@example.test')]);
  assert.equal(plan.records.length,1);assert.equal(plan.records[0].needs_review,true);assert.deepEqual(plan.records[0].draft,{});
  assert.throws(()=>planTallyImport([record('1','one@example.test'),record('1','two@example.test')]));
});
test('prefill excludes ambiguity, contacts, consent and conflicting professional links',()=>{
  const {records,summary}=planTallyImport([record('1','one@example.test',{'Basic Information':'Ambiguous name','Last Name':'Name','Whatsapp Number':'123',Agreements:'true','LinkedIn Profile':'https://www.linkedin.com/feed/','GitHub Profile URL':'https://github.com/person-one','GitHub Username':'person-two','Tell us about yourself':'x'.repeat(1001)})]);
  assert.deepEqual(records[0].draft,{location:'Test City, Test Country'});assert.equal(summary.githubConflicts,1);assert.equal(summary.omittedNameFields,1);
});
