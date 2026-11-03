// Hostinger cron entry point. No browser session, public trigger or default write.
import {loadPipelineModule} from './pipeline-test-loader.mjs';
import {advanceDurableScan} from '../lib/opportunities/durable-workhub-scan.mjs';
const action=process.argv[2];
const required=['METTELO_PIPELINE_ENABLED','METTELO_PIPELINE_SUPABASE_URL','METTELO_PIPELINE_SERVICE_ROLE_KEY'];
if(action==='check'){
 console.log(JSON.stringify({configured:required.every(name=>Boolean(process.env[name])),missing:required.filter(name=>!process.env[name]),scheduled:false,productionEnabled:false}));
}else if(!['scan','verify','expire'].includes(action)){
 console.error('Choose check, scan, verify or expire. No default action runs.');process.exitCode=1;
}else{
 try{
  const runner=loadPipelineModule('website-runner'),db=runner.pipelineClient();let result;
  if(action==='scan'){
   const {data,error}=await db.rpc('website_opportunity_scan',{p_action:'read',p_payload:{}});
   if(error)throw Error('Scan status could not be read.');
   if(data.state?.complete&&Date.now()-Date.parse(data.state.startedAt)<6*3600000)result={skipped:true,reason:'Completed scan is less than six hours old.'};
   else result=await advanceDurableScan(db,{restart:Boolean(data.state?.complete)||(data.state&&Date.now()-Date.parse(data.state.startedAt)>86400000)});
  }else if(action==='verify')result=await runner.verifyWebsiteOpportunitySources();
  else result=await runner.retryWebsiteOpportunityExpiry();
  console.log(JSON.stringify({action,result,finishedAt:new Date().toISOString()}));
 }catch{console.error(`${action} was not confirmed. Inspect the database checkpoint and run logs before retrying. Credentials are withheld.`);process.exitCode=1;}
}
