import test from 'node:test';
import assert from 'node:assert/strict';
import {recruitmentState} from '../lib/recruitment-state.mjs';
test('approved collaborator places and occupied/revoking places determine discovery, independently of official members',()=>{
 const base={can_manage:true,occupied:1,recruitment:{collaborator_capacity:3,open:true},members:Array(8).fill({status:'confirmed'})};
 const s=recruitmentState(base);assert.equal(s.available,2);assert.equal(s.published,true);
 assert.equal(recruitmentState({...base,occupied:3}).published,false);
 assert.equal(recruitmentState({...base,can_manage:false}).canEdit,false);
});
test('absent approval is distinguished from unavailable capacity and never grants editing',()=>{
 const absent=recruitmentState({can_manage:true,occupied:0,recruitment:null});assert.equal(absent.capacity,0);assert.equal(absent.canEdit,false);
 for(const collaborator_capacity of [undefined,-1,'3',NaN]){const s=recruitmentState({can_manage:true,occupied:0,recruitment:{collaborator_capacity}});assert.equal(s.capacity,null);assert.equal(s.available,null);assert.equal(s.canEdit,false);}
});
