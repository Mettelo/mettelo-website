import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWorkhubSearch,parseWorkhubJob,workhubCivilServiceIdentity,fetchWorkhubJobs,probeWorkhubVacancy,scanWorkhubBatch,workhubHasNextPage} from '../lib/opportunities/workhub-source.mjs';
const id='a'.repeat(24),id2='b'.repeat(24),url=`https://www.jobs.service.gov.uk/jobs/${id}`;
const card=(key=id,employer='Government Recruitment Service')=>`<div data-testid="searchResultCard-${key}"><a href="/jobs/${key}"><h2>Data Engineer</h2></a><p data-testid="searchResultCardEmployer"><span>${employer}</span></p></div>`;
const advert=(closing='9 Nov 2030',employer='Government Recruitment Service',location='London')=>`<h1 data-testid="pageHeading">Data Engineer</h1><td data-testid="companyName">${employer}</td><td data-testid="postingDate">26 Oct 2026</td><td data-testid="closingDate">${closing}</td><td data-testid="location">${location}</td><h2>Summary</h2><div class="rawHtmlContainer">Build data pipelines.</div>`;
const apply='<a href="https://www.civilservicejobs.service.gov.uk/csr/jobs.cgi?vxsys=4&amp;vxvac=123456">Continue</a>';
test('Work Hub search selects only exact GRS employer records',()=>{
 assert.deepEqual(parseWorkhubSearch('Showing results'+card()+card(id2,'Private recruitment agency')),[url]);
 assert.throws(()=>parseWorkhubSearch('<html>Access check</html>'));
});
test('Work Hub requires original dates, future closing date and GRS employer',()=>{
 const job=parseWorkhubJob(advert(),url);assert.equal(job.publishedAt,'2026-10-26T00:00:00.000Z');assert.equal(job.closesAt,'2030-11-09T23:59:59.000Z');
 assert.equal(parseWorkhubJob(advert().replace('Data Engineer','Graduate Data Engineer'),url).opportunityType,'graduate');
 assert.equal(parseWorkhubJob(advert('1 Nov 2026'),url),null);
 assert.throws(()=>parseWorkhubJob(advert('31 Feb 2030'),url));
 assert.throws(()=>parseWorkhubJob(advert('9 Nov 2030','Private agency'),url));
 assert.throws(()=>parseWorkhubJob(advert(),'https://evil.example/jobs/'+id));
});
test('CSJ identity rejects search sessions and unreviewed destinations',()=>{
 assert.equal(workhubCivilServiceIdentity(apply),'vxvac-123456');
 assert.equal(workhubCivilServiceIdentity('<a href="https://www.civilservicejobs.service.gov.uk/csr/index.cgi?SID=temporary">Apply</a>'),null);
 assert.equal(workhubCivilServiceIdentity(apply.replace('www.civilservicejobs.service.gov.uk','evil.example')),null);
 assert.throws(()=>workhubCivilServiceIdentity(apply+apply.replace('123456','999999')),/ambiguous/);
});
test('location adverts merge using CSJ ID and only fixed official routes are fetched',async()=>{
 const calls=[];
 const jobs=await fetchWorkhubJobs({terms:['data'],fetcher:async target=>{calls.push(target);return new Response(target.includes('/search?')?'Showing results'+card()+card(id2):target.endsWith('/before-you-apply')?apply:advert('9 Nov 2030','Government Recruitment Service',target.includes(id2)?'Leeds':'London'));}});
 assert.equal(jobs.length,1);assert.equal(jobs[0].externalId,'workhub-vxvac-123456');assert.equal(jobs[0].location,'London; Leeds');
 assert.ok(calls.every(target=>new URL(target).origin==='https://www.jobs.service.gov.uk'));
});
test('Work Hub outages and access checks never count as closure',async()=>{
 assert.equal((await probeWorkhubVacancy(url,async()=>new Response('Check',{status:403}))).state,'transient');
 assert.equal((await probeWorkhubVacancy(url,async()=>new Response('',{status:410}))).state,'missing');
 assert.equal((await probeWorkhubVacancy(url,async()=>new Response(advert()))).state,'active');
});
test('pagination uses exact next page and keyword, not matching page 20 as page 2',()=>{
 assert.equal(workhubHasNextPage('<a href="/jobs/search?keywords=data&amp;pageNumber=20">20</a>','data',1),false);
 assert.equal(workhubHasNextPage('<a href="/jobs/search?keywords=data&amp;pageNumber=2">Next</a>','data',1),true);
 assert.equal(workhubHasNextPage('<a href="https://evil.example/jobs/search?keywords=data&amp;pageNumber=2">Next</a>','data',1),false);
});
test('scan cursor resumes on the next unprocessed page and rejects corrupt cursors before fetching',async()=>{
 const fetched=[];
 const fetcher=async target=>{const u=new URL(target);fetched.push(u.searchParams.get('pageNumber'));return new Response('Showing results<a href="/jobs/search?keywords=data&amp;pageNumber=2">Next</a><a href="/jobs/search?keywords=data&amp;pageNumber=3">3</a>');};
 const first=await scanWorkhubBatch({pageBudget:1,fetcher});assert.deepEqual(first.cursor,{term:0,page:2});
 const next=await scanWorkhubBatch({pageBudget:1,cursor:first.cursor,fetcher});assert.deepEqual(next.cursor,{term:0,page:3});assert.deepEqual(fetched,['1','2']);
 await assert.rejects(scanWorkhubBatch({cursor:{term:-1,page:1},fetcher}),/Invalid/);
});
