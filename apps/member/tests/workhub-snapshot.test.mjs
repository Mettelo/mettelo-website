import test from 'node:test';
import assert from 'node:assert/strict';
import {validatedWorkhubSnapshot,fetchStagingWorkhubSnapshot} from '../lib/opportunities/workhub-staging-scan.mjs';
import {WORKHUB_SOURCE,WORKHUB_TERMS} from '../lib/opportunities/workhub-source.mjs';
import {advanceStagingWorkhubScan} from '../lib/opportunities/workhub-scan-store.mjs';
import {workhubScanDirectory} from '../lib/opportunities/workhub-scan-path.mjs';
import {resolve,join} from 'node:path';
const now=Date.parse('2030-11-01T12:00:00Z');
const job={provider:'civilservice',externalId:'workhub-vxvac-123',organisation:'Government Recruitment Service',sourceOrganisation:WORKHUB_SOURCE,title:'Data Engineer',description:'Build pipelines',url:'https://www.jobs.service.gov.uk/jobs/'+'a'.repeat(24),publishedAt:'2030-10-25',closesAt:'2030-11-10'};
const state={version:1,terms:WORKHUB_TERMS,startedAt:'2030-11-01T10:00:00Z',updatedAt:'2030-11-01T11:00:00Z',jobs:[job]};
test('extended scan rejects stale snapshots, foreign sources and untrusted application hosts',()=>{
 assert.equal(validatedWorkhubSnapshot(state,now).length,1);
 assert.throws(()=>validatedWorkhubSnapshot({...state,updatedAt:'2030-10-01'},now));
 assert.throws(()=>validatedWorkhubSnapshot({...state,jobs:[{...job,url:'https://evil.example/job'}]},now));
 assert.throws(()=>validatedWorkhubSnapshot({...state,jobs:[{...job,organisation:'Private agency'}]},now));
 assert.equal(validatedWorkhubSnapshot({...state,jobs:[{...job,closesAt:'2030-10-30'}]},now).length,0);
});
test('extended scan cannot load into production even with the staging project URL',async()=>{
 const mode=process.env.NODE_ENV,url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 try{process.env.NODE_ENV='production';process.env.NEXT_PUBLIC_SUPABASE_URL='https://jxijdjmjuzslmjxolhjl.supabase.co';assert.deepEqual(await fetchStagingWorkhubSnapshot(),[]);await assert.rejects(advanceStagingWorkhubScan(),/only in local staging/);}
 finally{if(mode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=mode;if(url===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=url;}
});
test('app preview and repository CLI resolve the same runtime snapshot directory',()=>{
 const repo=resolve('fixture-repo');assert.equal(workhubScanDirectory(repo),join(repo,'private-data'));assert.equal(workhubScanDirectory(join(repo,'apps','member')),join(repo,'private-data'));
});
