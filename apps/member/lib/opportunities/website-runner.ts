import {createClient} from '@supabase/supabase-js';
import {runOpportunityDiscovery,type DiscoveredJob} from './discovery';
import {safeOpportunityLink} from '../opportunity-links.mjs';
import {executePreparedBatch,executeExpiry,validatePreparedBatch} from './runner-contract.mjs';
import {probeOpportunitySource} from './source-verification.mjs';
import {randomUUID} from 'node:crypto';

// Server-only runner. It has no public route and no scheduler is enabled.
export function pipelineClient(){
 if(process.env.METTELO_PIPELINE_ENABLED!=='staging')throw new Error('Website pipeline activation is not configured.');
 const url=process.env.METTELO_PIPELINE_SUPABASE_URL;
 const key=process.env.METTELO_PIPELINE_SERVICE_ROLE_KEY;
 if(url!=='https://jxijdjmjuzslmjxolhjl.supabase.co'||!key)throw new Error('The pipeline requires its isolated staging destination and server credential.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function prepareWebsiteOpportunityBatch(runId:string,extended?:{jobs:DiscoveredJob[];coverageNote:string}){
 validatePreparedBatch({runId,candidates:[]});
 const discovery=await runOpportunityDiscovery({extraSource:extended?['Civil Service · Work Hub extended scan',async()=>Object.assign(extended.jobs,{coverageNote:extended.coverageNote})]:undefined});
 if(!('candidates' in discovery)||!discovery.candidates||!discovery.source_stats.some(source=>source.configured&&!source.error))throw new Error('No opportunity source completed successfully. Nothing published.');
 const candidates=discovery.candidates.filter(item=>item.classification.status==='high'&&item.classification.score>=85).map(item=>({
  external_job_id:`${item.provider}:${item.externalId}`,title:item.title,organisation:item.organisation,
  opportunity_type:item.opportunityType,summary:item.description.slice(0,320),location:item.location,closes_at:item.closesAt||null,
  source_url:safeOpportunityLink(item.url),official_application_url:safeOpportunityLink(item.url),
  original_published_at:item.publishedAt,data_ai_relevance_score:item.classification.score,
  data_ai_relevance_status:item.classification.status,role_family:item.classification.roleFamily,
  source_organisation:item.sourceOrganisation,country_code:item.countryCode,
  work_arrangement:item.remote?'remote':'unknown',remote_scope:item.remote?'remote':null,
  applicant_scope:'unknown',sponsorship_status:'not_stated',classification_version:'website-uk-tech-v7'
 }));
 // Never silently discard qualifying jobs when the database batch limit is reached.
 validatePreparedBatch({runId,candidates});
 return {runId,candidates,sourceStats:discovery.source_stats};
}
export async function runWebsiteOpportunityPipeline(batch:Awaited<ReturnType<typeof prepareWebsiteOpportunityBatch>>){
 validatePreparedBatch(batch);
 const db=pipelineClient();
 return executePreparedBatch((name:string,args?:Record<string,unknown>)=>db.rpc(name,args),batch);
}
export async function retryWebsiteOpportunityExpiry(){
 const db=pipelineClient();
 return executeExpiry((name:string)=>db.rpc(name));
}
export async function verifyWebsiteOpportunitySources(){
 const db=pipelineClient();
 const {data,error}=await db.from('opportunities').select('id,official_application_url,source_url,source_organisation')
  .eq('status','published').or(`next_verification_at.is.null,next_verification_at.lte.${new Date().toISOString()}`)
  .order('next_verification_at',{ascending:true,nullsFirst:true}).limit(100);
 if(error)throw new Error('Source verification queue is unavailable. No source checks started.');
 const counts={checked:0,expired:0,skipped:0};
 for(const item of data||[]){
  const target=item.official_application_url||item.source_url;
  const result=await probeOpportunitySource(target,fetch,item.source_organisation);
  const {data:recorded,error:writeError}=await db.rpc('website_record_source_check',{
   p_check_id:randomUUID(),p_opportunity_id:item.id,p_expected_url:target,
   p_state:result.state,p_http_status:'status' in result?result.status:null
  });
  if(writeError)throw new Error('Source verification stopped with an unconfirmed result. Earlier checks may be recorded; inspect the queue before retrying.');
  if(recorded?.applied){counts.checked++;if(recorded.expired)counts.expired++;if(result.state==='skipped')counts.skipped++;}
 }
 return counts;
}
