import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {classifyJob,detectSeniority,discoveryPlan,discoveryTerms,jobCategories,TAXONOMY_VERSION} from '../lib/opportunities/job-classification.mjs';
import {classifiedBatchRows,assertCurrentTaxonomyBatch} from '../lib/opportunities/classified-batch.mjs';
import {loadPipelineModule} from '../scripts/pipeline-test-loader.mjs';
const positive=[['Data Analyst','01'],['Business Analyst','02'],['Power BI Developer','03'],['Data Engineer','04'],['Data Scientist','05'],['RAG Engineer','06'],['Statistician','07'],['Performance Analyst','08'],['Data Steward','09'],['Clinical Informatics Specialist','10'],['Product Analyst','11'],['Credit Risk Modeller','12'],['Supply Chain Data Analyst','13'],['Database Administrator','14'],['GIS Analyst','15'],['SOC Analyst','16'],['Research Software Engineer','17'],['Data Product Manager','18'],['Chief Data Officer','19'],['Government Statistician','20'],['Ontology Engineer','21']];
test('the supplied library is reproducible, complete across 21 categories and stays out of the client label module',async()=>{
 const source=JSON.parse(await readFile(new URL('../../../content/opportunity-taxonomy.json',import.meta.url),'utf8')),snapshot=JSON.parse(await readFile(new URL('../lib/opportunities/job-taxonomy.snapshot.json',import.meta.url),'utf8'));
 assert.deepEqual(snapshot,source);assert.equal(jobCategories.length,21);assert.ok(source.occupations.length>1200);assert.equal(new Set(source.occupations.map(o=>o.id)).size,source.occupations.length);
 const labels=await import('../lib/opportunities/job-taxonomy-labels.mjs');assert.equal(labels.TAXONOMY_VERSION,TAXONOMY_VERSION);assert.deepEqual(labels.jobCategories,jobCategories);
});
test('recognised professional titles cover all 21 requested families without needing a long advert',()=>{for(const [title,category] of positive){const c=classifyJob(title);assert.equal(c.eligible,true,title);assert.ok(c.categories.includes(category),title+' missing '+category);assert.equal(c.semanticModelUsed,false);}});
test('UK/US spelling, acronyms, combined occupations and reordered title words are recognised',()=>{
 for(const title of ['Senior Data & Insights Officer','Insights and Data Analyst','Performance and Insight Analyst','Business Intelligence & Reporting Officer','MI and Reporting Analyst','Information and Performance Officer','Digital Data and Insight Lead','Data, Digital and Technology Analyst','Senior Manager, Data Analytics','Data Visualization Developer','Data Modeling Specialist','Senior BI Developer','MLOps Engineer']){
  const c=classifyJob(title,'You will build Power BI dashboards and analyse data using SQL and Python.');assert.equal(c.eligible,true,title);
 }
});
test('ambiguous and adjacent titles require relevant duties as well as supporting skills',()=>{
 for(const title of ['Information Officer','Research Officer','Programme Analyst','Policy Analyst','Software Engineer','Cloud Engineer','Intelligence Officer']){
  assert.equal(classifyJob(title,'Work with colleagues and communicate effectively.').status,'medium',title);
  const c=classifyJob(title,'You will build data pipelines in SQL and Python, develop data models and maintain reporting dashboards.');assert.equal(c.eligible,true,title);assert.ok(c.skills.includes('SQL'));assert.ok(c.responsibilities.length>0);
 }
});
test('incidental data, acronym substrings, routine work and internal-only posts never qualify',()=>{
 for(const title of ['Staff Nurse','Chair of Committee','Air Conditioning Technician','Warehouse Operative','Data Entry Clerk','Data Administrative Assistant','Customer Service Assistant'])assert.equal(classifyJob(title,'Read the information and record patient data accurately.').eligible,false,title);
 assert.equal(classifyJob('AI Data Entry Clerk','Build SQL dashboards using Python and Power BI.').eligible,false);
 for(const description of ['Internal applicants only.','Only open to existing employees.'])assert.equal(classifyJob('Data Engineer',description).roleFamily,'Internal only');
 assert.equal(classifyJob('Data Engineer','Work with internal stakeholders and external partners.').eligible,true);
 assert.equal(classifyJob('Programme Officer','No SQL experience is required; Python is not required.').eligible,false);
});
test('unusual roles can qualify from substantive description evidence without keyword-only qualification',()=>{
 const c=classifyJob('Decision Support Partner','You will build data pipelines in SQL and Python and develop reporting dashboards.');assert.equal(c.eligible,true);assert.ok(c.categories.includes('04'));
 assert.equal(classifyJob('Community Partner','SQL Python Power BI Excel AI machine learning.').eligible,false);
});
test('industry and seniority stay separate from the occupational family',()=>{
 const c=classifyJob('Senior BI Developer','',{provider:'nhs',organisation:'Example NHS Trust'});for(const id of ['03','10','20'])assert.ok(c.categories.includes(id));assert.equal(c.seniority,'senior');assert.equal(c.primaryCategory,'03');assert.deepEqual(c.industries,['Healthcare','Public sector']);
 const principal=classifyJob('Principal AI Engineer');assert.ok(principal.categories.includes('19'));assert.equal(principal.primaryCategory,'06');
 for(const title of ['Information Officer','Research Executive','Associate Data Analyst','Data Engineer'])assert.equal(detectSeniority(title),'not_stated',title);
 assert.equal(detectSeniority('Chief Data Officer'),'executive');assert.equal(detectSeniority('Senior Staff Data Engineer'),'staff');assert.equal(detectSeniority('Associate Director of Data'),'leadership');assert.equal(detectSeniority('Graduate Data Engineer'),'graduate');
});
test('bounded discovery plans cover the entire library over a rotation and never issue hundreds of title searches',()=>{
 const union=new Set();for(let day=0;day<discoveryTerms.length*2;day++){const p=discoveryPlan({at:day*86400000});assert.ok(p.terms.length<=12);assert.equal(new Set(p.terms).size,p.terms.length);p.terms.forEach(t=>union.add(t));assert.match(p.coverageNote,/Not complete/);}
 for(const term of discoveryTerms)assert.ok(union.has(term),term);assert.equal(discoveryPlan({limit:2}).terms.length,2);
});
test('prepared rows preserve advertised titles and keep review cases out of the publishable batch',()=>{
 const make=(title,description='')=>({provider:'nhs',externalId:title,title,description,organisation:'Fixture Trust',url:'https://www.jobs.nhs.uk/candidate/jobadvert/fixture',location:'Leeds',publishedAt:new Date().toISOString(),closesAt:null,countryCode:'GB',remote:false,opportunityType:'job',sourceOrganisation:'NHS Jobs',classification:classifyJob(title,description,{provider:'nhs'})});
 const batch=classifiedBatchRows([make('Senior BI Developer'),make('Information Officer'),make('Data Entry Clerk')]);assert.equal(batch.candidates.length,1);assert.equal(batch.reviewCandidates.length,1);assert.equal(batch.candidates[0].title,'Senior BI Developer');assert.equal(batch.candidates[0].classification_details.seniority,'senior');assertCurrentTaxonomyBatch(batch);
 assert.throws(()=>assertCurrentTaxonomyBatch({...batch,taxonomyVersion:'legacy'}),/fresh preview/);assert.throws(()=>assertCurrentTaxonomyBatch({...batch,candidates:[{classification_version:TAXONOMY_VERSION,classification_details:{eligible:false}}]}));
 assert.throws(()=>classifiedBatchRows(Array.from({length:501},()=>make('Information Officer'))),/silently discarded/);
});
test('discovery keeps review candidates visible and detects placement types without graduate boilerplate leakage',async()=>{
 const {runOpportunityDiscovery}=loadPipelineModule('discovery');const titles=['Senior Data Engineer','Graduate Data Analyst','Apprentice Data Analyst','Information Officer','Data Entry Clerk'];
 const result=await runOpportunityDiscovery({sourceCalls:[['Synthetic',async()=>titles.map((title,i)=>({provider:'nhs',externalId:String(i),title,organisation:'Fixture',description:'We mentor graduates and interns.',location:'Leeds',url:'https://www.jobs.nhs.uk/candidate/jobadvert/'+i,publishedAt:new Date().toISOString(),remote:false,countryCode:'GB',opportunityType:'job',sourceOrganisation:'NHS Jobs'}))]]});
 assert.equal(result.qualifying,3);assert.equal(result.candidates[0].opportunityType,'job');assert.equal(result.candidates[1].opportunityType,'graduate');assert.equal(result.candidates[2].opportunityType,'apprenticeship');assert.equal(result.source_stats[0].selection.reviewRequired,1);assert.equal(result.source_stats[0].selection.outOfScope,1);
});

test('public-sector aliases do not label private employers as government and R is a language only in context',()=>{
 const privateRole=classifyJob('Data Engineer','',{organisation:'Example Software Ltd'});assert.ok(!privateRole.categories.includes('20'));assert.ok(!privateRole.industries.includes('Public sector'));
 assert.ok(classifyJob('Government Statistician').categories.includes('20'));
 assert.ok(classifyJob('Research Officer','You will use R and SQL to build data pipelines.').skills.includes('R'));
 assert.ok(!classifyJob('Research Officer','Our R&D group collaborates with partners.').skills.includes('R'));
 assert.equal(classifyJob('Senior Governance and Data Officer').eligible,true);
});

test('BA, DA, DS, ML and AI abbreviations need context rather than becoming automatic title matches',()=>{
 for(const title of ['BA','DA','DS','ML','AI']){assert.equal(classifyJob(title).status,'medium',title);assert.equal(classifyJob(title,'You will build data pipelines using SQL and Python and develop reporting dashboards.').eligible,true,title);}
 assert.equal(classifyJob('BA','Gather business requirements and conduct business process mapping using BPMN and user stories.').eligible,true);
});

test('nonstandard domain titles are held for review instead of silently lost or automatically published',()=>{const result=classifyJob('Working Student Data Operations & Process Support');assert.equal(result.status,'medium');assert.equal(result.eligible,false);});

test('a strong technical description without a supported occupational category stays in review',()=>{
 const c=classifyJob('Programme Partner','You will use Python and R to conduct business process mapping and lead service improvement.');assert.equal(c.status,'medium');assert.equal(c.eligible,false);assert.ok(c.reasons.some(r=>r.includes('category needs review')));
});
