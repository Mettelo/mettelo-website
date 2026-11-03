import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadPipelineModule} from './pipeline-test-loader.mjs';
import {savePreparedBatch,loadPreparedBatch,saveRunReceipt} from '../lib/opportunities/prepared-batch-store.mjs';
const root=fileURLToPath(new URL('../../../private-data/opportunity-runs/',import.meta.url));
const [action,id]=process.argv.slice(2);
if(!['prepare','inspect','run','expiry','verify-sources'].includes(action))throw new Error('Choose prepare, inspect RUN_ID, run RUN_ID, expiry, or verify-sources. No default write action.');
const runner=loadPipelineModule('website-runner');
if(action==='prepare'){
 const batch=await runner.prepareWebsiteOpportunityBatch(randomUUID());
 console.log(JSON.stringify(await savePreparedBatch(root,batch),null,2));
}else if(action==='inspect'){
 const batch=await loadPreparedBatch(root,id);console.log(JSON.stringify({runId:batch.runId,candidates:batch.candidates.length,sourceStats:batch.sourceStats},null,2));
}else if(action==='verify-sources'){
 console.log(JSON.stringify(await runner.verifyWebsiteOpportunitySources()));
}else if(action==='expiry'){
 console.log(JSON.stringify({expired:await runner.retryWebsiteOpportunityExpiry()}));
}else{
 const batch=await loadPreparedBatch(root,id);
 await saveRunReceipt(root,id,{state:'dispatching'});
 try{const result=await runner.runWebsiteOpportunityPipeline(batch);await saveRunReceipt(root,id,{state:'complete',result});console.log(JSON.stringify(result,null,2));}
 catch{await saveRunReceipt(root,id,{state:'unconfirmed',guidance:'Inspect database run status. Retry the same prepared batch, or expiry only when publication is confirmed.'});throw new Error('Run not confirmed. The saved receipt records recovery instructions; do not generate a replacement batch for this run ID.');}
}
