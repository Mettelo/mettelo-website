import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {workhubScanDirectory} from './workhub-scan-path.mjs';
import {workhubAdvertUrl,workhubOpportunityType,WORKHUB_TERMS,WORKHUB_SOURCE} from './workhub-source.mjs';
export function validatedWorkhubSnapshot(state,now=Date.now()){
 if(!Number.isFinite(Date.parse(state?.startedAt))||Date.parse(state.startedAt)>now||now-Date.parse(state.startedAt)>86400000)throw Error('Extended Work Hub scan started more than 24 hours ago. Start a fresh scan.');
 if(state?.version!==1||JSON.stringify(state.terms)!==JSON.stringify(WORKHUB_TERMS)||!Array.isArray(state.jobs)||state.jobs.length>2000||!Number.isFinite(Date.parse(state.updatedAt))||Date.parse(state.updatedAt)>now||now-Date.parse(state.updatedAt)>86400000)throw Error('Extended Work Hub scan is invalid or older than 24 hours.');
 return state.jobs.map(job=>{
  if(job.provider!=='civilservice'||!/^workhub-(vxvac|jcode)-\d+$/.test(job.externalId)||job.organisation!=='Government Recruitment Service'||job.sourceOrganisation!==WORKHUB_SOURCE||!workhubAdvertUrl(job.url)||typeof job.title!=='string'||!job.title.trim()||typeof job.description!=='string'||!Number.isFinite(Date.parse(job.publishedAt))||Date.parse(job.publishedAt)>now||!Number.isFinite(Date.parse(job.closesAt)))throw Error('Extended Work Hub scan contains an invalid advert.');
  return {...job,opportunityType:workhubOpportunityType(job.title)};
 }).filter(job=>Date.parse(job.closesAt)>now);
}
export async function fetchStagingWorkhubSnapshot(){
 if(process.env.NODE_ENV!=='development'||process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://jxijdjmjuzslmjxolhjl.supabase.co')return [];
 let text;try{text=await readFile(join(workhubScanDirectory(),'civil-service-scan.json'),'utf8');}catch(error){if(error.code==='ENOENT')return [];throw error;}
 if(text.length>5_000_000)throw Error('Extended Work Hub snapshot exceeds the size limit.');
 const state=JSON.parse(text),jobs=validatedWorkhubSnapshot(state);
 return Object.assign(jobs,{coverageNote:`${Array.isArray(state.pages)?state.pages.length:0} pages scanned · ${state.complete?'Selected-keyword scan finished':`Search continuing: ${WORKHUB_TERMS[state.cursor?.term]||'unknown'}, page ${state.cursor?.page||1}`} · GRS only; not all departments.`});
}
