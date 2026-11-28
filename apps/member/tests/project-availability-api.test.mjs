import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const next=uri('export class NextResponse extends Response{static json(body,options={}){return new NextResponse(JSON.stringify(body),{...options,headers:{...options.headers,"Content-Type":"application/json"}})}}');
const lab=uri('export async function labSession(){return {user:globalThis.availabilityFixture.user,db:{}}}');
const content=uri('export async function contentAdmin(db,action,payload){const f=globalThis.availabilityFixture;f.calls.push({action,payload});if(f.error)throw f.error;return {ok:true,state:payload.state,publication_version:3}}');
const origin=uri("export function profileRequestOriginAllowed(value){return value==='http://127.0.0.1:3001'}");
let code=ts.transpileModule(await fs.readFile(new URL('../app/api/admin/content/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const s=m[2],target=s==='next/server'?next:s==='@/lib/lab'?lab:s==='@/lib/site-content'?content:s==='@/lib/request-origin.mjs'?origin:new URL('../'+s.slice(2),import.meta.url).href;code=code.replace(m[0],'from '+JSON.stringify(target));}
const {POST}=await import(uri(code));
const fixture=changes=>(globalThis.availabilityFixture={user:{id:'controlled-admin'},calls:[],...changes});
const body={action:'project_status',key:'project:MTL-DA-001',state:'closed',expected_publication_version:2,confirmed:true,note:'Close applications for the current cohort'};
const request=(data=body,headers={origin:'http://127.0.0.1:3001'})=>new Request('http://127.0.0.1:3001/api/admin/content',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(data)});
test('availability changes reject a foreign origin and signed-out requests before any database action',async()=>{
 const f=fixture();assert.equal((await POST(request(body,{origin:'https://foreign.example'}))).status,403);assert.equal(f.calls.length,0);
 fixture({user:null});assert.equal((await POST(request())).status,401);assert.equal(globalThis.availabilityFixture.calls.length,0);
});
test('availability updates preserve confirmation, concurrency version and reason without publishing draft content',async()=>{
 const f=fixture(),result=await POST(request());assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(f.calls,[{action:'project_status',payload:{key:body.key,state:'closed',expected_publication_version:2,confirmed:true,note:body.note}}]);
 assert.equal((await result.json()).state,'closed');
});
test('database permission denial and stale availability are returned as actionable failures',async()=>{
 fixture({error:{code:'42501',message:'Project administrator access required'}});assert.equal((await POST(request())).status,403);
 fixture({error:{code:'40001',message:'Project availability changed. Reload before updating.'}});const r=await POST(request());assert.equal(r.status,409);assert.match((await r.json()).error,/Reload/);
});
