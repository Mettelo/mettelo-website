import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPipelineModule} from '../scripts/pipeline-test-loader.mjs';
import {UK_TECH_SEARCH_TERMS} from '../lib/opportunities/uk-public-sources.mjs';
const {runOpportunityDiscovery}=loadPipelineModule('discovery');
const base={provider:'nhs',organisation:'Synthetic NHS Trust',description:'Help our team deliver better services.',location:'London',url:'https://www.jobs.nhs.uk/candidate/jobadvert/test',publishedAt:new Date().toISOString(),closesAt:'2099-01-01T23:59:59Z',remote:false,countryCode:'GB',opportunityType:'job',sourceOrganisation:'NHS Jobs'};
const discover=jobs=>runOpportunityDiscovery({sourceCalls:[['NHS fixtures',async()=>jobs.map((job,i)=>({...base,externalId:String(i),...job}))]]});

test('recognised professional roles qualify; routine data entry and vague information titles do not',async()=>{
 const titles=['Chief Data and Analytics Officer','Chief Information Security Officer (CISO)','Information Governance Support Officer','Information Analyst','Data Governance Lead','Data Engineer','NIHR Data Manger','Data and AI Research Governance Coordinator','Applied Clinical Data Linkage Programme Officer','Health Informatics Administrator','AI Research Fellow','Machine Learning Scientist','Analytics Apprentice'];
 const result=await discover(titles.map(title=>({title})));for(const job of result.candidates)assert.equal(job.classification.status,'high',job.title);
 const uncertain=await discover(['Contract Information Manager – Community & MH','Information Assistant','Director of Information Services','Data Entry Clerk','Data Administrative Assistant'].map(title=>({title})));assert.equal(uncertain.qualifying,0);
});

test('incidental description words and substring matches do not qualify unrelated roles',async()=>{
 const result=await discover(['Staff Nurse','Chair of Committee','Air Conditioning Technician','Warehouse Operative'].map(title=>({title,description:'Read the information about this vacancy. Record patient data accurately.'})));
 assert.equal(result.qualifying,0);
});

test('explicit internal-only eligibility overrides a relevant title, not internal stakeholders',async()=>{
 const result=await discover([{title:'Data Officer (Internal)'},{title:'Information Analyst',description:'Internal applicants only.'},{title:'Chief Data Officer',description:'Only open to existing employees.'},{title:'Information Governance Officer',description:'Work with internal stakeholders and external partners.'}]);
 assert.equal(result.qualifying,1);
 assert.equal(result.candidates[3].classification.status,'high');
 assert.ok(result.candidates.slice(0,3).every(job=>job.classification.roleFamily==='Internal only'));
});

test('NHS discovery explicitly searches broader information and AI domains',()=>{
 for(const term of ['information','informatics','data governance','chief data','machine learning'])assert.ok(UK_TECH_SEARCH_TERMS.includes(term),term);
});
