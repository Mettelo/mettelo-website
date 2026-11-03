import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceDurableScan,durableScanCandidates} from '../lib/opportunities/durable-workhub-scan.mjs';
import {WORKHUB_TERMS} from '../lib/opportunities/workhub-source.mjs';
const state=()=>({version:1,terms:WORKHUB_TERMS,startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),cursor:{term:0,page:1},pages:[],jobs:[],complete:false});
function fakeDb({commitFails=false}={}){
 const calls=[],box={state:state(),revision:4};
 return {calls,box,async rpc(name,{p_action,p_payload}){assert.equal(name,'website_opportunity_scan');calls.push(p_action);if(p_action==='read')return {data:{state:box.state},error:null};if(p_action==='claim')return {data:{state:box.state,revision:box.revision,token:'test'},error:null};if(p_action==='commit'){if(commitFails)return {data:null,error:{message:'unknown'}};assert.equal(p_payload.revision,box.revision);box.state=p_payload.state;box.revision++;}return {data:{saved:true},error:null};}};
}
test('durable scan saves a bounded page with a revision and fresh checkpoint',async()=>{
 const db=fakeDb();const result=await advanceDurableScan(db,{fetcher:async()=>new Response('Showing results')});
 assert.equal(result.pagesScanned,1);assert.deepEqual(db.box.state.cursor,{term:1,page:1});assert.deepEqual(db.calls,['read','claim','commit']);
});
test('source failure releases the lease without changing the checkpoint',async()=>{
 const db=fakeDb(),before=JSON.stringify(db.box.state);
 await assert.rejects(advanceDurableScan(db,{fetcher:async()=>{throw Error('offline');}}));
 assert.equal(JSON.stringify(db.box.state),before);assert.deepEqual(db.calls,['read','claim','release']);
});
test('uncertain commit never releases or overwrites a potentially saved result',async()=>{
 const db=fakeDb({commitFails:true});await assert.rejects(advanceDurableScan(db,{fetcher:async()=>new Response('Showing results')}),/not confirmed/);
 assert.deepEqual(db.calls,['read','claim','commit']);
});
test('completed scans do not refetch and stale candidates cannot enter publication',async()=>{
 const db=fakeDb();db.box.state.complete=true;
 await advanceDurableScan(db,{fetcher:()=>{throw Error('should not fetch');}});assert.deepEqual(db.calls,['read']);
 db.box.state.startedAt='2000-01-01';const result=await durableScanCandidates(db);assert.deepEqual(result.jobs,[]);assert.match(result.coverageNote,/stale/);
});
