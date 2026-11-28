import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAdzuna,civilServiceEmployerLabel} from '../lib/opportunities/adzuna-evaluation.mjs';
test('Adzuna evaluation requires credentials before making any request',async()=>{
 await assert.rejects(evaluateAdzuna({fetcher:()=>{throw Error('should not run');}}),/needs ADZUNA/);
});
test('Civil Service employer matching does not accept keyword lookalikes',()=>{
 assert.equal(civilServiceEmployerLabel('Department for Work & Pensions'),true);
 assert.equal(civilServiceEmployerLabel('Civil Service Recruitment Agency'),false);
 assert.equal(civilServiceEmployerLabel('Home Office Supplies Ltd'),false);
});
test('evaluation deduplicates, validates links and reports an explicitly partial sample',async()=>{
 const job={id:1,title:'Data Engineer',company:{display_name:'Home Office'},redirect_url:'https://www.adzuna.co.uk/jobs/land/ad/1'};
 const report=await evaluateAdzuna({appId:'test',appKey:'secret',terms:['data','information'],fetcher:async url=>{assert.equal(new URL(url).hostname,'api.adzuna.com');return new Response(JSON.stringify({count:1000,results:[job,{...job,id:2,redirect_url:'https://evil.example/job'}]}));}});
 assert.equal(report.unique,1);assert.equal(report.invalid,2);assert.equal(report.duplicateResults,1);assert.equal(report.governmentEmployerMatches,1);assert.match(report.coverage,/partial sample/);assert.ok(!JSON.stringify(report).includes('secret'));
});
test('network errors never expose credential-bearing request URLs',async()=>{
 await assert.rejects(evaluateAdzuna({appId:'test',appKey:'secret',fetcher:async url=>{throw Error(url);}}),error=>!error.message.includes('secret')&&error.message.includes('withheld'));
});
test('targeted checks use documented company filtering and do not pretend zero results means no vacancies',async()=>{
 const report=await evaluateAdzuna({appId:'test',appKey:'secret',terms:[],companies:['Home Office'],fetcher:async value=>{const u=new URL(value);assert.equal(u.searchParams.get('company'),'Home Office');assert.ok(u.searchParams.has('what_or'));return new Response(JSON.stringify({count:0,results:[]}));}});
 assert.equal(report.queries[0].company,'Home Office');assert.equal(report.queries[0].reportedMatches,0);assert.match(report.coverage,/not established/);
});
