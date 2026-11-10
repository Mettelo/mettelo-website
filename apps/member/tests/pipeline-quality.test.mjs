import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyJob} from '../lib/opportunities/job-classification.mjs';
import {holdDuplicateAdverts} from '../lib/opportunities/duplicate-adverts.mjs';
import {classifiedBatchRows} from '../lib/opportunities/classified-batch.mjs';
import {probeOpportunitySource,verifiedSourceUrl,sourceCheckDecision} from '../lib/opportunities/source-verification.mjs';
import {loadPipelineModule} from '../scripts/pipeline-test-loader.mjs';
const description='You will design data pipelines using SQL and Python. Develop reporting dashboards and maintain data models with the analytics team. Own ingestion quality checks and work with engineers on production integrations. Build reliable services and document technical decisions for colleagues. '.repeat(3);
const make=(id,extra={})=>({provider:'arbeitnow',externalId:id,title:'Senior Data Engineer',organisation:'Example',description,location:'Zürich',url:'https://www.arbeitnow.ch/jobs/'+id,publishedAt:new Date().toISOString(),closesAt:null,countryCode:null,remote:false,opportunityType:'job',sourceOrganisation:'Arbeitnow',classification:classifyJob('Senior Data Engineer',description),...extra});
test('duplicate employer aliases with matching location and substantial advert text are held, never merged',()=>{
 const original=[make('a'),make('b',{organisation:'Examplelinkedin',description:description+' Contact the team.'})];
 const held=holdDuplicateAdverts(original);assert.equal(held.length,2);assert.ok(held.every(x=>x.classification.duplicateReview&&!x.classification.eligible));assert.equal(original[0].classification.eligible,true);
 const rows=classifiedBatchRows(held);assert.equal(rows.candidates.length,0);assert.equal(rows.reviewCandidates.length,2);assert.match(rows.reviewCandidates[0].classification_details.reasons.at(-1),/arbeitnow:b/);
});
test('different locations, employers, short text and different duties never collapse on matching title',()=>{
 for(const extra of [{location:'Amsterdam'},{organisation:'Other Employer'},{countryCode:'GB'},{description:'Short advert'},{description:'A distinct responsibility unique word different process objective entirely unrelated '.repeat(8)}])assert.equal(holdDuplicateAdverts([make('a'),make('b',extra)]).filter(x=>x.classification.eligible).length,2);
});
test('discovery reports duplicate holds separately from repeated source records',async()=>{
 const result=await loadPipelineModule('discovery').runOpportunityDiscovery({sourceCalls:[['Synthetic',async()=>[make('a'),make('b',{organisation:'Examplelinkedin'})]]]});
 assert.equal(result.qualifying,0);assert.equal(result.source_stats[0].selection.reviewRequired,2);assert.equal(result.source_stats[0].selection.duplicateReview,2);assert.equal(result.source_stats[0].selection.duplicates,0);
});
test('full compound governance occupation wins over an AI abbreviation',()=>{
 for(const title of ['Data & AI Governance Consultant','Senior Data and AI Governance Consultant','Governance Consultant, Data and AI']){const c=classifyJob(title);assert.equal(c.roleFamily,'Data Governance Consultant',title);assert.equal(c.primaryCategory,'09');assert.ok(!c.occupationIds.includes('ai-engineer'));}
 assert.equal(classifyJob('AI').eligible,false);assert.equal(classifyJob('AI Engineer').eligible,true);
});
test('physical data-centre warehouse jobs are not labelled as analysts despite AI company context',()=>{
 const c=classifyJob('Data Center Warehouse Specialist',description+' Our company builds AI models.');assert.equal(c.status,'low');assert.equal(c.canonicalTitle,null);assert.equal(c.roleFamily,'Excluded');
 assert.equal(classifyJob('Data Centre Inventory Specialist').eligible,false);
 assert.equal(classifyJob('Data Warehouse Specialist',description).eligible,true);
});
test('NHS advert hosting alone is not public-sector employer evidence',()=>{
 for(const organisation of ['Agincare','Vertis Health','Example CIC']){const c=classifyJob('Data Analyst','',{provider:'nhs',organisation,sourceOrganisation:'NHS Jobs'});assert.ok(c.industries.includes('Healthcare'));assert.ok(!c.industries.includes('Public sector'));assert.ok(!c.categories.includes('20'));}
 for(const organisation of ['Royal Free London NHS Foundation Trust','NHS England','NHS North East London Integrated Care Board'])assert.ok(classifyJob('Data Analyst','',{provider:'nhs',organisation}).categories.includes('20'));
 assert.ok(classifyJob('Data Analyst','',{provider:'civilservice',organisation:'Government Recruitment Service'}).categories.includes('20'));
 const privatePolicy=classifyJob('Data Analyst','Use SQL and R to conduct policy evaluation and evidence analysis.',{provider:'nhs',organisation:'Private Healthcare Ltd'});assert.ok(!privatePolicy.categories.includes('20'));
});
test('regional feed domains are checked while unreviewed hosts, credentials, ports and unsafe redirects remain blocked',async()=>{
 for(const host of ['www.arbeitnow.co.uk','www.arbeitnow.fr','www.arbeitnow.ch','www.arbeitnow.nl']){
  const url='https://'+host+'/jobs/example';assert.equal(verifiedSourceUrl(url),url);
  assert.equal((await probeOpportunitySource(url,async()=>new Response(null,{status:200}))).state,'active');
  const missing=await probeOpportunitySource(url,async()=>new Response(null,{status:404}));assert.equal(sourceCheckDecision(missing,0).expire,false);assert.equal(sourceCheckDecision(missing,1).expire,true);
  assert.equal((await probeOpportunitySource(url,async()=>new Response(null,{status:403}))).state,'transient');
  assert.equal((await probeOpportunitySource(url,async()=>new Response(null,{status:302,headers:{location:'https://unreviewed.invalid/job'}}))).state,'skipped');
 }
 for(const url of ['https://www.arbeitnow.fr.attacker.invalid/jobs','https://u:p@www.arbeitnow.fr/jobs','https://www.arbeitnow.fr:8443/jobs','http://www.arbeitnow.fr/jobs'])assert.equal(verifiedSourceUrl(url),null);
});
