import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stagingAccess} from '../lib/staging-access.mjs';
import {memberOrigin,profileRequestOriginAllowed} from '../lib/request-origin.mjs';
import {publicWebsiteOrigin,publicRuntimeOrigin} from '../lib/site-origins.mjs';
import {checkStagingEnvironment} from '../../../scripts/staging-preflight.mjs';
import {publicIndexingEnabled} from '../lib/seo-policy.mjs';
const origin='https://staging.mettelo.com';
const env={METTELO_MEMBER_ENVIRONMENT:'staging',NEXT_PUBLIC_SITE_ORIGIN:origin,NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN:origin,NEXT_PUBLIC_SUPABASE_URL:'https://jxijdjmjuzslmjxolhjl.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_fixture',METTELO_STAGING_USERNAME:'fixture'};
test('hosted configuration accepts only the isolated database, exact origin and disabled release gates',()=>{
 assert.equal(checkStagingEnvironment(env,{build:true}).ok,true);
 for(const changes of [{NEXT_PUBLIC_SUPABASE_URL:'https://production.invalid'},{NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN:'https://mettelo.com'},{METTELO_LAB_EMAIL_ENABLED:'true'},{METTELO_PUBLIC_INDEXING_ENABLED:'true'},{NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_secret_private'},{NEXT_PUBLIC_SERVICE_ROLE_KEY:'never-public'},{NEXT_PUBLIC_AUTH_GOOGLE_ENABLED:'true'}])assert.equal(checkStagingEnvironment({...env,...changes},{build:true}).ok,false);
 assert.equal(checkStagingEnvironment(env).ok,false);
 assert.equal(publicIndexingEnabled({...env,METTELO_PUBLIC_INDEXING_ENABLED:'true',METTELO_PUBLIC_SITE_ORIGIN:'https://mettelo.com'}),false);
});
test('staging site access fails closed and never acts as member authorization',async()=>{
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('fictional-test-password'))).toString('hex');
 const cfg={...env,METTELO_STAGING_PASSWORD_SHA256:hash};
 assert.deepEqual(await stagingAccess(null,cfg),{configured:true,allowed:false});
 assert.equal((await stagingAccess('Basic '+btoa('fixture:fictional-test-password'),cfg)).allowed,true);
 for(const value of ['Bearer token','Basic !!!','Basic '+btoa('other:fictional-test-password'),'Basic '+btoa('fixture:wrong')])assert.equal((await stagingAccess(value,cfg)).allowed,false);
 assert.equal((await stagingAccess(null,{})).configured,false);
});
test('hosted callbacks and navigation require both the approved staging identity and exact callback URL',()=>{
 const names=['NEXT_PUBLIC_SITE_ORIGIN','NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN','METTELO_MEMBER_ENVIRONMENT'];const old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 try{
  for(const k of names)process.env[k]=env[k];assert.equal(memberOrigin(),origin);assert.equal(publicWebsiteOrigin(),origin);assert.equal(publicRuntimeOrigin(),'');assert.equal(profileRequestOriginAllowed(origin),true);assert.equal(profileRequestOriginAllowed('https://mettelo.com'),false);
  for(const url of [origin+'.evil.test',origin+'/callback','https://u:p@staging.mettelo.com',origin+'?next=evil']){process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN=url;assert.throws(()=>memberOrigin());}
  process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN=origin;delete process.env.METTELO_MEMBER_ENVIRONMENT;assert.throws(()=>memberOrigin());
 }finally{for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
test('hosted preparation activates account links without changing the static release package',async()=>{
 const source=await readFile(new URL('../../../scripts/prepare-hosted-staging.mjs',import.meta.url),'utf8');
 assert.ok(source.includes("'apps/member/public/_site'"));assert.ok(source.includes("path==='industry-news'"));assert.ok(source.includes("['robots.txt','sitemap.xml']"));
 const middleware=await readFile(new URL('../middleware.ts',import.meta.url),'utf8');assert.ok(middleware.indexOf('await stagingAccess')<middleware.indexOf('memberSupabaseConfiguration();'));assert.ok(middleware.includes("matcher:['/:path*']"));
});
