import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {savePreparedBatch,loadPreparedBatch,saveRunReceipt} from '../lib/opportunities/prepared-batch-store.mjs';
test('prepared batch survives restart, refuses overwrite and detects modification',async()=>{
 const root=await mkdtemp(join(tmpdir(),'mettelo-batch-'));const batch={runId:'10000000-0000-4000-8000-000000000501',candidates:[{title:'Synthetic'}]};
 try{
  await savePreparedBatch(root,batch);assert.deepEqual(await loadPreparedBatch(root,batch.runId),batch);
  await assert.rejects(savePreparedBatch(root,batch),{code:'EEXIST'});
  const receipt=await saveRunReceipt(root,batch.runId,{state:'unconfirmed'});
  assert.equal(JSON.parse(await readFile(receipt,'utf8')).state,'unconfirmed');
  const path=join(root,`${batch.runId}.json`);const record=JSON.parse(await readFile(path,'utf8'));record.batch.candidates[0].title='Changed';await writeFile(path,JSON.stringify(record));
  await assert.rejects(loadPreparedBatch(root,batch.runId),/integrity/);
  await assert.rejects(loadPreparedBatch(root,'../outside'),/Invalid/);
 }finally{await rm(root,{recursive:true,force:true});}
});
