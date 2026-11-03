import {loadPipelineModule} from './pipeline-test-loader.mjs';
const {runOpportunityDiscovery}=loadPipelineModule('discovery');
const result=await runOpportunityDiscovery();
console.log(JSON.stringify({dryRun:result.dry_run,scanned:result.scanned,qualifying:result.qualifying,sources:result.source_stats},null,2));
if(result.source_stats.every(source=>source.error||!source.configured))process.exitCode=1;
