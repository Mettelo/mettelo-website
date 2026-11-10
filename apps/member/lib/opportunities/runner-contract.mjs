export function validatePreparedBatch(batch){
 if(!batch||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batch.runId)||!Array.isArray(batch.candidates)||batch.candidates.length>500)throw new Error('Invalid prepared opportunity batch.');
 return batch;
}
// A retry must reuse this exact prepared payload. Never fetch new data for a replay.
export async function executePreparedBatch(rpc,batch){
 validatePreparedBatch(batch);
 let published;
 try{published=await rpc('website_publish_opportunity_batch',{p_run_id:batch.runId,p_candidates:batch.candidates});}
 catch{throw new Error('Publication status is unknown. Retry the same prepared batch and run ID; do not rebuild it.');}
 if(published.error)throw new Error('Publication was not confirmed. Retry the same prepared batch; inspect the run before replacing it.');
 const report=published.data;
 if(!report||!['written','rejected','protected'].every(key=>Number.isInteger(report[key])&&report[key]>=0))throw new Error('Publication response was incomplete. Inspect this run before continuing.');
 const expired=await executeExpiry(rpc);
 return {runId:batch.runId,publication:report,expired};
}
export async function executeExpiry(rpc){
 let result;
 try{result=await rpc('website_expire_opportunities');}catch{throw new Error('Expiry status is unknown. Retry expiry only; publication may already be committed.');}
 if(result.error||!Number.isInteger(result.data)||result.data<0)throw new Error('Expiry was not confirmed. Retry expiry only; do not report a complete run.');
 return result.data;
}
