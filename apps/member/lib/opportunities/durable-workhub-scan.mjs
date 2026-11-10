import {scanWorkhubBatch,mergeWorkhubJobs,WORKHUB_TERMS} from './workhub-source.mjs';
import {validatedWorkhubSnapshot} from './workhub-staging-scan.mjs';
async function call(db,action,payload={}){
 const {data,error}=await db.rpc('website_opportunity_scan',{p_action:action,p_payload:payload});
 if(error)throw Error(`Civil Service scan ${action} was not confirmed. Refresh before retrying.`);
 return data;
}
const empty=()=>({version:1,terms:WORKHUB_TERMS,startedAt:new Date().toISOString(),cursor:{term:0,page:1},jobs:[],pages:[],complete:false});
function progress(state){return state?{requiresRestart:state.version!==1||JSON.stringify(state.terms)!==JSON.stringify(WORKHUB_TERMS),complete:state.complete,pagesScanned:state.pages.length,uniqueVacancies:state.jobs.length,nextKeyword:WORKHUB_TERMS[state.cursor.term]||null,nextPage:state.cursor.page}:null;}
export async function durableScanProgress(db){const result=await call(db,'read');return progress(result.state);}
export async function durableScanCandidates(db){
 const {state}=await call(db,'read');
 if(!state)return {jobs:[],coverageNote:'Extended scan has not started. Start it from the pipeline controls.'};
 let jobs;try{jobs=validatedWorkhubSnapshot(state);}catch{return {jobs:[],coverageNote:'Extended scan is stale or invalid. Start a fresh scan before using these results.'};}
 return {jobs,coverageNote:`${state.pages.length} pages scanned · ${state.complete?'Selected-keyword scan finished':'Scan incomplete; use Continue Civil Service scan'} · GRS only; not all departments. Progress stored in the website database.`};
}
export async function advanceDurableScan(db,{restart=false,fetcher=fetch}={}){
 const previous=await call(db,'read');if(previous.state&&progress(previous.state).requiresRestart&&!restart)throw Error('Search terms changed. Start a fresh Civil Service scan.');if(previous.state?.complete&&!restart)return progress(previous.state);
 const claim=await call(db,'claim');let dispatched=false;
 try{
  let state=restart?empty():(claim.state||empty());
  if(JSON.stringify(state.terms)!==JSON.stringify(WORKHUB_TERMS)||state.version!==1)throw Error('Scan terms changed. Start a fresh scan.');
  if(Date.now()-Date.parse(state.startedAt)>86400000)throw Error('Scan is older than 24 hours. Start a fresh scan.');
  const deadline=AbortSignal.timeout(45000);
  const boundedFetch=(url,options={})=>fetcher(url,{...options,signal:options.signal?AbortSignal.any([deadline,options.signal]):deadline});
  const batch=await scanWorkhubBatch({cursor:state.cursor,pageBudget:1,fetcher:boundedFetch});
  state={...state,cursor:batch.cursor,complete:batch.complete,pages:[...state.pages,...batch.pages],jobs:mergeWorkhubJobs([...state.jobs,...batch.jobs]),updatedAt:new Date().toISOString()};
  dispatched=true;
  await call(db,'commit',{token:claim.token,revision:claim.revision,state});
  return progress(state);
 }catch(error){
  // An unknown commit result may already have saved. Never release its lease or replay a new payload.
  if(!dispatched)await call(db,'release',{token:claim.token,revision:claim.revision,error:'Batch stopped; previous checkpoint retained.'}).catch(()=>{});
  throw error;
 }
}
