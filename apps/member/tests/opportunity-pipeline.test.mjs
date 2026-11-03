import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPipelineModule} from '../scripts/pipeline-test-loader.mjs';
const {runOpportunityDiscovery}=loadPipelineModule('discovery');
const job={provider:'arbeitnow',externalId:'example',title:'Data Engineer',organisation:'Synthetic',description:'Python SQL data pipeline analytics',location:'London',url:'https://example.com',publishedAt:new Date().toISOString(),remote:false,countryCode:'GB',opportunityType:'job',sourceOrganisation:'Synthetic'};
test('transferred discovery dry run deduplicates, excludes stale jobs and classifies without a database',async()=>{
 const result=await runOpportunityDiscovery({sourceCalls:[['Synthetic',async()=>[job,job,{...job,externalId:'old',publishedAt:'2000-01-01'},{...job,externalId:'excluded',title:'Warehouse Operative'}]],['Failed source',async()=>{throw new Error('Synthetic failure');}]]});
 assert.equal(result.dry_run,true);assert.equal(result.scanned,2);assert.equal(result.qualifying,1);assert.equal(result.source_errors.length,1);
 assert.deepEqual(result.source_stats[0].selection,{eligible:1,internalOnly:0,outOfScope:1,staleOrClosed:1,duplicates:1});
 assert.equal(result.source_stats[1].error,'Synthetic failure');
});
test('all pipeline write paths stay disabled before network or database work',async()=>{
 await assert.rejects(runOpportunityDiscovery({dryRun:false,sourceCalls:[]}),/not enabled/);
 await assert.rejects(loadPipelineModule('quality').runOpportunityQualitySweep(),/not enabled/);
 await assert.rejects(loadPipelineModule('lifecycle').runOpportunityLifecycle(),/not enabled/);
});
