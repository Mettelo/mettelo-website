import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const next=uri('export class NextResponse extends Response{static json(body,options={}){return new NextResponse(JSON.stringify(body),{...options,headers:{...options.headers,"Content-Type":"application/json"}})}}');
const origin=uri("export function profileRequestOriginAllowed(value){return value==='https://staging.mettelo.com'}");
const db=uri('export async function createServerSupabaseClient(){return {auth:{async verifyOtp(payload){globalThis.recoveryFixture.calls.push(payload);return {error:globalThis.recoveryFixture.error}}}}}');
let code=ts.transpileModule(await fs.readFile(new URL('../app/api/auth/recovery/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
for(const [specifier,url] of [['next/server',next],['@/lib/request-origin.mjs',origin],['@/lib/supabase/server',db]])code=code.replaceAll(`from '${specifier}'`,`from '${url}'`).replaceAll(`from "${specifier}"`,`from '${url}'`);
const {POST}=await import(uri(code));
const hash='a'.repeat(64);
function fixture(error=null){return globalThis.recoveryFixture={calls:[],error};}
const request=(body={token_hash:hash},origin='https://staging.mettelo.com')=>new Request('https://staging.mettelo.com/api/auth/recovery',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});

test('recovery checks the email token without requiring the requesting browser PKCE cookie',async()=>{
 const f=fixture();const r=await POST(request({token_hash:hash,type:'signup',next:'https://evil.invalid'}));
 assert.equal(r.status,200);assert.deepEqual(f.calls,[{token_hash:hash,type:'recovery'}]);assert.deepEqual(await r.json(),{next:'/auth/update-password'});
 assert.match(r.headers.get('cache-control'),/private.*no-store/);assert.equal(r.headers.get('referrer-policy'),'no-referrer');
});
test('foreign origins and malformed tokens never reach Auth',async()=>{
 const f=fixture();assert.equal((await POST(request(undefined,'https://evil.invalid'))).status,403);
 for(const token_hash of ['',null,'https://evil.invalid',hash.repeat(5)])assert.equal((await POST(request({token_hash}))).status,400);
 assert.equal(f.calls.length,0);
});
test('used tokens, provider outages and rate limits remain failures without leaking provider detail',async()=>{
 for(const [error,status] of [[{code:'otp_expired',status:403,message:hash},400],[{code:'over_request_rate_limit',status:429,message:hash},429],[{code:'unexpected_failure',status:500,message:hash},503]]){
  fixture(error);const r=await POST(request());assert.equal(r.status,status);assert.doesNotMatch(await r.text(),new RegExp(hash));
 }
});
test('email recovery lands with a fragment secret and requires an explicit confirmation, not a consuming GET',async()=>{
 const html=await fs.readFile(new URL('../../../supabase/templates/auth/recovery.html',import.meta.url),'utf8');
 assert.match(html,/href="\{\{ \.SiteURL \}\}\/auth\/recover#token_hash=\{\{ \.TokenHash \}\}"/);
 assert.doesNotMatch(html,/href="\{\{ \.ConfirmationURL \}\}"/);
 const page=await fs.readFile(new URL('../app/auth/recover/page.tsx',import.meta.url),'utf8');
 const effect=page.slice(page.indexOf('useEffect(()=>'),page.indexOf('async function submit'));
 assert.doesNotMatch(effect,/fetch\(|verifyOtp/);assert.match(effect,/replaceState/);
 assert.match(page,/Continue to reset password/);assert.match(page,/method:'POST'/);
});
