import {test} from 'node:test';
import assert from 'node:assert/strict';
import {executePreparedBatch,executeExpiry} from '../lib/opportunities/runner-contract.mjs';
import {probeOpportunitySource,sourceCheckDecision} from '../lib/opportunities/source-verification.mjs';
const batch={runId:'10000000-0000-4000-8000-000000000401',candidates:[]};
test('publication uncertainty never reports success or starts expiry',async()=>{
 let calls=0;await assert.rejects(executePreparedBatch(async()=>{calls++;throw new Error('Network lost after commit');},batch),/unknown/);assert.equal(calls,1);
 await assert.rejects(executePreparedBatch(async()=>({data:null,error:{message:'database rejected'}}),batch),/not confirmed/);
});
test('expiry can be retried alone after publication commits',async()=>{
 const calls=[];const report={written:1,rejected:0,protected:0};
 await assert.rejects(executePreparedBatch(async(name,args)=>{calls.push([name,args]);return name==='website_publish_opportunity_batch'?{data:report,error:null}:{data:null,error:{}};},batch),/Retry expiry only/);
 assert.deepEqual(calls[0][1].p_candidates,batch.candidates);
 let expiryCalls=0;assert.equal(await executeExpiry(async name=>{assert.equal(name,'website_expire_opportunities');expiryCalls++;return {data:1,error:null};}),1);assert.equal(expiryCalls,1);
});
test('source probing refuses private hosts and unsafe redirects without following them',async()=>{
 let calls=0;const blocked=await probeOpportunitySource('https://127.0.0.1/internal',async()=>{calls++;});assert.equal(blocked.state,'skipped');assert.equal(calls,0);
 const redirect=await probeOpportunitySource('https://remotive.com/job',async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://169.254.169.254/latest'}});});assert.equal(redirect.state,'skipped');assert.equal(calls,1);
});
test('source failures require confirmation and transient errors never expire a role',async()=>{
 const missing=await probeOpportunitySource('https://remotive.com/job',async()=>new Response(null,{status:404}));
 assert.deepEqual(sourceCheckDecision(missing),{expire:false,failures:1});assert.deepEqual(sourceCheckDecision(missing,1),{expire:true,failures:2});
 const rateLimited=await probeOpportunitySource('https://remotive.com/job',async()=>new Response(null,{status:429}));assert.equal(sourceCheckDecision(rateLimited,1).expire,false);
 assert.deepEqual(sourceCheckDecision({state:'active'},1),{expire:false,failures:0});
});
