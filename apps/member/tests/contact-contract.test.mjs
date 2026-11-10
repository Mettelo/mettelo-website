import test from 'node:test';import assert from 'node:assert/strict';
import {validateContact} from '../lib/contact-contract.mjs';
const valid={nonce:'12345678-1234-4234-8234-123456789012',name:'Test Person',email:'TEST@example.invalid',category:'privacy',subject:'A test enquiry',message:'A useful explanation of the test enquiry.',consent:true};
test('public contact normalises the sender and keeps only supported fields',()=>{assert.equal(validateContact({...valid,admin:true}).email,'test@example.invalid');assert.equal(validateContact({...valid,admin:true}).admin,undefined);});
test('public contact requires consent, valid contact details and bounded content',()=>{for(const change of [{consent:false},{email:'invalid'},{category:'admin'},{subject:'x'},{message:'x'},{message:'x'.repeat(5001)},{nonce:'bad'}])assert.throws(()=>validateContact({...valid,...change}));});

test('partnership enquiries retain organisation context in the private support message',()=>{
 const input={...valid,category:'partnership',organisation:' Example organisation ',organisation_role:'Partnerships lead',organisation_url:'https://example.test/about'};
 const result=validateContact(input);
 assert.match(result.message,/^Organisation: Example organisation\nRole: Partnerships lead\nWebsite: https:\/\/example.test\/about/);
 assert.ok(result.message.endsWith(valid.message));
 assert.equal(result.organisation,undefined);
 assert.match(validateContact({...input,organisation_url:'',organisation_role:''}).message,/Website: Not supplied/);
 for(const change of [{organisation:''},{organisation:'x'.repeat(141)},{organisation_role:'x'.repeat(101)},{organisation_url:'javascript:alert(1)'},{organisation_url:'https://user:secret@example.test'},{organisation_url:'http://example.test'},{message:'x'.repeat(4301)}])assert.throws(()=>validateContact({...input,...change}));
 assert.ok(validateContact({...input,message:'x'.repeat(4300),organisation:'x'.repeat(140),organisation_role:'x'.repeat(100),organisation_url:'https://example.test/'+ 'x'.repeat(250)}).message.length<=5000);
 assert.equal(validateContact({...valid,organisation:'Ignored on non-partnership topic'}).message,valid.message);
});
