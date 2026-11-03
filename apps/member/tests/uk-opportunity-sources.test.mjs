import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNhsFeed,parseCivilServiceFeed,fetchNhsJobs,probeNhsVacancy,parseDwpDigitalJobs} from '../lib/opportunities/uk-public-sources.mjs';
import {probeOpportunitySource} from '../lib/opportunities/source-verification.mjs';
import {sourceCheckDecision} from '../lib/opportunities/source-verification.mjs';
import {loadPipelineModule} from '../scripts/pipeline-test-loader.mjs';
const {runOpportunityDiscovery}=loadPipelineModule('discovery');
const vacancy=(extra='')=>`<vacancyDetails><id>123</id><title>Data Governance Analyst</title><employer>Example NHS Trust</employer><description>SQL &amp; data quality</description><closeDate>2030-01-01</closeDate><postDate>2026-01-01T10:00:00</postDate><url>https://www.jobs.nhs.uk/candidate/jobadvert/C1234-26-0001</url><locations><location>Leeds</location></locations>${extra}</vacancyDetails>`;
const xml=`<nhsJobs>${vacancy()}<totalPages>2</totalPages></nhsJobs>`;
const response=body=>new Response(body,{headers:{'content-type':'application/xml'}});
const dwpCard=(id='123',deadline='8 November 2030',host='www.civilservicejobs.service.gov.uk')=>`<a class="job-card-size" href=" https://${host}/csr/jobs.cgi?jcode=${id}"><h2>Lead Test Engineer</h2><p>Leeds</p><p>SQL data quality</p><p>Closing date: ${deadline}</p></a>`;
test('DWP cards require an official Civil Service job ID and future deadline, without inventing posting dates',()=>{
 const jobs=parseDwpDigitalJobs(dwpCard());assert.equal(jobs.length,1);assert.equal(jobs[0].publishedAt,null);assert.equal(jobs[0].externalId,'csj-123');assert.equal(jobs[0].closesAt,'2030-11-08T23:59:59.000Z');
 assert.equal(parseDwpDigitalJobs(dwpCard('123','8 November 2020')).length,0);assert.equal(parseDwpDigitalJobs(dwpCard('123','unknown')).length,0);assert.equal(parseDwpDigitalJobs(dwpCard('123','8 November 2030','evil.example')).length,0);assert.throws(()=>parseDwpDigitalJobs('<html>Quick check</html>'));
});
test('DWP checks are department-scoped; bot pages and outages are not closure evidence',async()=>{
 const url='https://www.civilservicejobs.service.gov.uk/csr/jobs.cgi?jcode=123',source='DWP Digital · Civil Service Jobs';
 assert.equal((await probeOpportunitySource(url,async()=>response(dwpCard()),source)).state,'active');
 assert.equal((await probeOpportunitySource(url,async()=>response(dwpCard('456')),source)).state,'absent_feed');
 assert.equal((await probeOpportunitySource(url,async()=>response('<html>Quick check</html>'),source)).state,'transient');
 assert.equal((await probeOpportunitySource(url,async()=>{throw Error('must not fetch');},'Other department')).state,'skipped');
});
test('NHS parser retains official source, deadline and location, excluding closed or unsafe adverts',()=>{
 const {jobs,totalPages}=parseNhsFeed(xml,Date.parse('2026-11-03'));assert.equal(jobs.length,1);assert.equal(totalPages,2);assert.equal(jobs[0].closesAt,'2030-01-01T23:59:59.000Z');assert.equal(jobs[0].countryCode,'GB');assert.equal(jobs[0].location,'Leeds');
 assert.equal(parseNhsFeed(xml.replace('2030-01-01','2020-01-01')).jobs.length,0);assert.equal(parseNhsFeed(xml.replace('https://www.jobs.nhs.uk','https://127.0.0.1')).jobs.length,0);
 assert.throws(()=>parseNhsFeed('<html>Quick check</html>'));assert.throws(()=>parseNhsFeed('<!DOCTYPE nhsJobs><nhsJobs/>'));
});
test('NHS fetching is external-only, bounded, paginated and deduplicated',async()=>{
 const calls=[];const jobs=await fetchNhsJobs({terms:['data'],maxPages:2,fetcher:async url=>{calls.push(new URL(url));return response(xml);}});
 assert.equal(calls.length,2);assert.equal(jobs.length,1);assert.equal(calls[0].searchParams.get('externalOnly'),'true');assert.equal(calls[1].searchParams.get('page'),'2');
});
test('official Civil Service Atom feed handles empty feeds and official-source jobs',()=>{
 assert.deepEqual(parseCivilServiceFeed('<feed><title>Home Office</title></feed>'),[]);
 const jobs=parseCivilServiceFeed('<feed><author><name>Home Office</name></author><entry><id>role1</id><title>Business Analyst</title><published>2026-11-01T12:00:00Z</published><link rel="alternate" href="https://homeofficejobs.tal.net/vx/lang-en-GB/candidate/postings/1"/><summary>Digital transformation</summary></entry></feed>');assert.equal(jobs.length,1);assert.equal(jobs[0].provider,'civilservice');assert.equal(jobs[0].organisation,'Home Office');
 assert.equal(parseCivilServiceFeed('<feed><entry><title>Data Analyst</title><published>2026-11-01</published><link href="https://evil.example/job"/></entry></feed>').length,0);
});
test('NHS absence needs a valid exact-reference feed; outages never imply closure',async()=>{
 const url='https://www.jobs.nhs.uk/candidate/jobadvert/C1234-26-0001';
 assert.equal((await probeNhsVacancy(url,async()=>response(xml))).state,'active');
 assert.equal((await probeNhsVacancy(url,async()=>response('<nhsJobs><totalResults>0</totalResults></nhsJobs>'))).state,'absent_feed');
 assert.equal((await probeNhsVacancy(url,async()=>response('<html>Quick check</html>'))).state,'transient');
 assert.equal(sourceCheckDecision({state:'absent_feed'},0).expire,false);assert.equal(sourceCheckDecision({state:'absent_feed'},1).expire,true);
});
test('UK technical families qualify including data operations while unrelated clinical jobs do not',async()=>{
 const base=parseNhsFeed(xml).jobs[0];const titles=['Business Analyst','Performance Analyst','Data Architect','AI Engineer','Cloud Engineer','Data Entry Clerk','Staff Nurse'];
 const result=await runOpportunityDiscovery({sourceCalls:[['UK synthetic',async()=>titles.map((title,i)=>({...base,title,externalId:String(i)}))]]});assert.equal(result.qualifying,6);assert.equal(result.scanned,7);
});
