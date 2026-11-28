import {mkdir,readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import {scanWorkhubBatch,mergeWorkhubJobs,WORKHUB_TERMS} from './workhub-source.mjs';
import {join} from 'node:path';
import {workhubScanDirectory} from './workhub-scan-path.mjs';
const directory=workhubScanDirectory(),file=join(directory,'civil-service-scan.json'),lock=join(directory,'civil-service-scan.lock');
function progress(state){return {complete:state.complete,pagesScanned:state.pages.length,uniqueVacancies:state.jobs.length,nextKeyword:WORKHUB_TERMS[state.cursor.term]||null,nextPage:state.cursor.page};}
export async function readWorkhubScanProgress(){
 try{return progress(JSON.parse(await readFile(file,'utf8')));}catch(error){if(error.code==='ENOENT')return null;throw Error('Civil Service scan progress could not be read.');}
}
export async function advanceWorkhubScan({restart=false}={}){
 await mkdir(directory,{recursive:true});let handle;
 try{
  try{handle=await open(lock,'wx');}catch(error){if(error.code==='EEXIST')throw Error('A Civil Service scan batch is already running. Retry after it finishes.');throw error;}
  let state;try{state=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;state={version:1,terms:WORKHUB_TERMS,startedAt:new Date().toISOString(),cursor:{term:0,page:1},jobs:[],pages:[],complete:false};}
  if(state.version!==1||JSON.stringify(state.terms)!==JSON.stringify(WORKHUB_TERMS))throw Error('Saved scan terms changed; preserve the old scan before starting a new one.');
  if(restart)state={version:1,terms:WORKHUB_TERMS,startedAt:new Date().toISOString(),cursor:{term:0,page:1},jobs:[],pages:[],complete:false};
  if(!state.complete){const batch=await scanWorkhubBatch({cursor:state.cursor});state={...state,cursor:batch.cursor,complete:batch.complete,pages:[...state.pages,...batch.pages],jobs:mergeWorkhubJobs([...state.jobs,...batch.jobs]),updatedAt:new Date().toISOString()};await writeFile(join(directory,'civil-service-scan.tmp'),JSON.stringify(state,null,2));await rename(join(directory,'civil-service-scan.tmp'),file);}
  return progress(state);
 }finally{if(handle){await handle.close();await unlink(lock);}}
}
export async function advanceStagingWorkhubScan(options={}){
 if(process.env.NODE_ENV!=='development'||process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://jxijdjmjuzslmjxolhjl.supabase.co')throw Error('Extended scan controls are available only in local staging.');
 return advanceWorkhubScan(options);
}
