import assert from 'node:assert/strict';
const origin='https://staging.mettelo.com';
const username=process.env.METTELO_STAGING_USERNAME,password=process.env.METTELO_STAGING_TEST_PASSWORD;
if(!username||!password)throw Error('Provide staging test credentials through the process environment, never command arguments.');
const authorization='Basic '+Buffer.from(username+':'+password).toString('base64');
let passed=0;const failures=[];
async function request(path,authenticated=true){
 for(let n=0;n<3;n++){
  const r=await fetch(origin+path,{headers:authenticated?{authorization}:{},redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(r.status!==308)return r;
  const next=new URL(r.headers.get('location'),origin);if(next.origin!==origin)throw Error('Unexpected cross-origin redirect');path=next.pathname+next.search;
 }
 throw Error('Redirect limit exceeded');
}
async function check(name,fn){try{await fn();passed++;}catch{failures.push(name);}}
for(const path of ['/','/signin','/api/navigation','/mettelo-logo.svg'])await check('site access '+path,async()=>assert.equal((await request(path,false)).status,401));
for(const path of ['/','/our-story','/projects','/privacy','/terms','/contact','/signin','/opportunities','/industry-news'])await check('page '+path,async()=>{const r=await request(path);assert.equal(r.status,200);assert.match(r.headers.get('x-robots-tag')||'',/noindex/);});
for(const path of ['/member','/admin/members'])await check('member sign-in boundary '+path,async()=>{const r=await request(path);assert.equal(r.status,307);assert.ok(r.headers.get('location').startsWith(origin+'/signin?next='));});
await check('homepage account links',async()=>{const html=await(await request('/')).text();assert.match(html,/href="\/signup" data-member-route="\/signup"/);assert.ok(!html.includes('href="http://127.0.0.1'));});
await check('robots',async()=>assert.match(await(await request('/robots.txt')).text(),/Disallow: \//));
console.log(JSON.stringify({origin,passed,failed:failures.length,failures,accountsCreated:0,emailsSent:0},null,2));if(failures.length)process.exitCode=1;
