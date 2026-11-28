import test from 'node:test';
import assert from 'node:assert/strict';
import {memberManagementRequest as parse} from '../lib/member-management.mjs';
const id='11111111-1111-4111-8111-111111111111';
test('search is bounded and restricted to supported statuses and page numbers',()=>{
 assert.deepEqual(parse({action:'list',q:'  Taiwo ',status:'active',page:2}),{action:'list',payload:{q:'Taiwo',status:'active',page:2}});
 for(const patch of [{q:{}},{q:'x'.repeat(101)},{page:-1},{page:Infinity},{status:'deleted'}])assert.throws(()=>parse({action:'list',...patch}));
});
test('access mutations require a UUID, current version, reason and confirmation',()=>{
 const body={action:'suspend',user_id:id,version:0,reason:'Review requested',confirmation:'member@example.test'};
 assert.equal(parse(body).payload.version,0);
 for(const patch of [{user_id:'../admin'},{version:false},{version:-1},{reason:'short'},{confirmation:''}])assert.throws(()=>parse({...body,...patch}));
 assert.equal(parse({...body,action:'restore'}).action,'restore');
});
test('unsupported destructive and privilege actions and unknown fields are rejected or discarded',()=>{
 for(const action of ['delete','remove','make_admin','ban_forever'])assert.throws(()=>parse({action,user_id:id}));
 assert.deepEqual(parse({action:'detail',user_id:id,make_admin:true}),{action:'detail',payload:{user_id:id}});
 assert.throws(()=>parse(null));assert.throws(()=>parse([]));
});

test('role changes accept only the five approved roles with a current role version and confirmation',()=>{
 const base={action:'set_role',user_id:id,role:'writer',role_version:0,reason:'Editorial responsibility approved',confirmation:' member@example.test '};
 for(const role of ['member','writer','editor','operations_admin','full_admin'])assert.deepEqual(parse({...base,role,make_admin:true}).payload,{user_id:id,role,role_version:0,reason:base.reason,confirmation:'member@example.test'});
 for(const patch of [{role:'superuser'},{role:'admin'},{role_version:-1},{role_version:undefined},{role_version:1.5},{reason:'short'},{confirmation:''},{user_id:'invalid'}])assert.throws(()=>parse({...base,...patch}));
});
