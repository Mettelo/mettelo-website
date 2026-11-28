import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHmrcSearch,parseHmrcJob,fetchHmrcJobs,probeHmrcVacancy} from '../lib/opportunities/hmrc-source.mjs';
import {parseCpsCards,parseCpsJob,fetchCpsJobs,probeCpsVacancy,cpsAdvertUrl} from '../lib/opportunities/cps-source.mjs';
import {loadPipelineModule} from '../scripts/pipeline-test-loader.mjs';
const hmrcUrl='https://careers.hmrc.gov.uk/jobs/senior-data-engineer';
const hmrc=(closing='Nov 16 2030')=>`<script type="application/ld+json">${JSON.stringify({'@type':'JobPosting',title:'Senior Data Engineer',identifier:{value:'abc123'},datePosted:'2026-10-01T10:00:00Z',validThrough:'2099-01-01',hiringOrganization:{name:'HMRC'},description:'SQL Python data pipelines',jobLocation:[{address:{addressLocality:'Leeds'}}]})}</script><span id="closing_on_icon_text_abc">Closing on: ${closing}</span>`;
const index=(url=hmrcUrl,next='')=>`<div class="block-job-search-results"><h3 class="job-search-results-card-title"><a href="${url}">Role</a></h3>${next}</div>`;
const card=(day='2030-11-11',path='/index%2ephp/career/performance-analyst')=>`<div class="teaser teaser--career"><div class="teaser__title"><a href="${path}" class="teaser__link">Performance Analyst</a></div><div class="teaser__label">Profession:</div><p>Digital</p><div class="teaser__label">Location:</div><p>Reading</p><time datetime="${day}T12:00:00Z">${day}</time></div>`;
const advert=(url='https://www.cps.gov.uk/careers/digital')=>`Applications are open until 11 November 2030<div class="career-opportunity__apply-link"><a href="${url}">Apply now</a></div>`;
test('HMRC uses applicant deadline rather than later syndication expiry and keeps original posting date',()=>{
 const job=parseHmrcJob(hmrc(),hmrcUrl);assert.equal(job.closesAt,'2030-11-16T23:59:59.000Z');assert.equal(job.publishedAt,'2026-10-01T10:00:00.000Z');assert.equal(job.location,'Leeds');
 assert.equal(parseHmrcJob(hmrc('Nov 16 2020'),hmrcUrl),null);assert.throws(()=>parseHmrcJob(hmrc('Feb 31 2030'),hmrcUrl));assert.throws(()=>parseHmrcJob(hmrc(),'https://evil.example/jobs/test'));assert.throws(()=>parseHmrcJob('<html>Check required</html>',hmrcUrl));
});
test('HMRC follows only official bounded search pages and never treats access checks as vacancies',async()=>{
 assert.equal(parseHmrcSearch(index()).urls.length,1);assert.throws(()=>parseHmrcSearch(index('https://evil.example/job')));assert.throws(()=>parseHmrcSearch(index(hmrcUrl,'<a rel="next" href="https://evil.example/jobs/search?page=2">Next</a>')));
 await assert.rejects(()=>fetchHmrcJobs({fetcher:async()=>new Response('Check required',{status:202})}),/unavailable/);
 await assert.rejects(()=>fetchHmrcJobs({maxPages:1,fetcher:async()=>new Response(index(hmrcUrl,'<a rel="next" href="/jobs/search?page=2">Next</a>'))}),/coverage incomplete/);
 assert.equal((await probeHmrcVacancy(hmrcUrl,async()=>new Response('check',{status:202}))).state,'transient');
 assert.equal((await probeHmrcVacancy(hmrcUrl,async()=>new Response('',{status:410}))).state,'missing');
});
test('CPS cards require future valid deadlines and stable official advert paths',()=>{
 const cards=parseCpsCards(card());assert.equal(cards.length,1);assert.equal(cards[0].url,'https://www.cps.gov.uk/career/performance-analyst');assert.equal(cards[0].location,'Reading');
 assert.equal(parseCpsCards(card('2020-01-01')).length,0);assert.throws(()=>parseCpsCards(card('2030-02-31')));assert.throws(()=>parseCpsCards(card('2030-01-01','https://evil.example/career/test')));assert.equal(cpsAdvertUrl('https://evil.example/career/test'),null);
 const job=parseCpsJob(advert(),cards[0]);assert.equal(job.publishedAt,null);assert.equal(job.externalId,'cps-performance-analyst');assert.equal(job.url,cards[0].url);assert.throws(()=>parseCpsJob(advert('https://evil.example'),cards[0]));
});
test('CPS discovery validates application routes; outages cannot imply closure',async()=>{
 const jobs=await fetchCpsJobs({fetcher:async url=>new Response(url.includes('careers-crown')?card():advert())});assert.equal(jobs.length,1);
 assert.equal((await probeCpsVacancy(jobs[0].url,async()=>new Response(advert()))).state,'active');assert.equal((await probeCpsVacancy(jobs[0].url,async()=>new Response('Check required'))).state,'transient');assert.equal((await probeCpsVacancy(jobs[0].url,async()=>new Response('',{status:404}))).state,'missing');
});
test('Civil Service technology and information roles qualify while unrelated legal roles stay out',async()=>{
 const {runOpportunityDiscovery}=loadPipelineModule('discovery');const base=parseCpsJob(advert(),parseCpsCards(card())[0]);
 const titles=['Area Performance Analyst','Senior IT Service Manager','Lead Corporate Knowledge and Information Manager','Finance Systems Analyst','Senior Infrastructure Engineer','Technical Architect','Crown Prosecutor','Paralegal Officer'];
 const result=await runOpportunityDiscovery({sourceCalls:[['Official departmental fixtures',async()=>titles.map((title,i)=>({...base,title,externalId:String(i)}))]]});assert.equal(result.qualifying,1);
 assert.ok(result.candidates.slice(1,6).every(job=>job.classification.status==='medium'));assert.ok(result.candidates.slice(6).every(job=>job.classification.status==='low'));
 const withDuties=await runOpportunityDiscovery({sourceCalls:[['Technical duty fixtures',async()=>titles.slice(0,6).map((title,i)=>({...base,title,externalId:String(i),description:'You will build data pipelines in SQL and Python and develop reporting dashboards.'}))]]});assert.equal(withDuties.qualifying,6);
});
