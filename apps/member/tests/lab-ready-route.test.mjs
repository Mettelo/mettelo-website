import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const next=uri('export class NextResponse extends Response{static json(body,options={}){return new NextResponse(JSON.stringify(body),options)}static redirect(url,status){return new NextResponse(null,{status,headers:{location:String(url)}})}}');
const lab=uri('export async function labSession(){return {user:globalThis.readyRouteFixture.user,db:{}}} export async function labRpc(db,action,payload){globalThis.readyRouteFixture.calls.push({action,payload});return globalThis.readyRouteFixture.result}');
const origin=uri("export function profileRequestOriginAllowed(value){return value==='http://127.0.0.1:3001'}");
let code=ts.transpileModule(await fs.readFile(new URL('../app/api/lab/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
for(const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const name=match[2],target=name==='next/server'?next:name==='@/lib/lab'?lab:name==='@/lib/request-origin.mjs'?origin:new URL('../'+name.slice(2),import.meta.url).href;code=code.replace(match[0],'from '+JSON.stringify(target));}
const {POST}=await import(uri(code));
const team='00000000-0000-4000-8000-000000000001';
const fixture=result=>(globalThis.readyRouteFixture={user:{id:'member'},calls:[],result});
const request=(action,extra={},origin='http://127.0.0.1:3001')=>new Request('http://127.0.0.1:3001/api/lab',{method:'POST',headers:{origin},body:new URLSearchParams({action,team_id:team,...extra})});
test('final personal setup steps and later official acceptance lead directly to the Lab overview',async()=>{
 for(const action of ['respond','confirm_commitment','agree_coordinator','agree_two']){fixture({activation:{activated:action!=='respond',admitted:1}});const result=await POST(request(action,{response:'accept'}));assert.equal(result.status,303);const location=new URL(result.headers.get('location'));assert.equal(location.pathname,'/member/lab/'+team);assert.equal(location.searchParams.get('view'),null);assert.match(location.searchParams.get('notice'),/Your Lab is ready/);}
});
test('declines and still-waiting acceptances return to the journey rather than an inaccessible Lab',async()=>{
 fixture({activation:{activated:false,admitted:0}});let result=await POST(request('respond',{response:'accept'}));assert.equal(new URL(result.headers.get('location')).pathname,'/member/lab');fixture({activation:{activated:true,admitted:2}});result=await POST(request('respond',{response:'decline'}));assert.equal(new URL(result.headers.get('location')).pathname,'/member/lab');assert.doesNotMatch(new URL(result.headers.get('location')).searchParams.get('notice'),/Lab is ready/);
});
test('new minimum-setting actions retain verified-session and same-origin guards and pass only approved fields',async()=>{
 let f=fixture({ok:true});let r=await POST(request('project_start_policy',{project_ref:'MTL-AI-010',minimum_members:'2',reason:'Reviewed project policy',invented:'discard'}));assert.equal(r.status,303);assert.equal(f.calls[0].payload.minimum_members,'2');assert.equal(f.calls[0].payload.invented,undefined);f=fixture({});f.user=null;r=await POST(request('team_start_policy'));assert.equal(r.status,401);assert.equal(f.calls.length,0);f=fixture({});r=await POST(request('team_start_policy',{},'https://foreign.example'));assert.equal(r.status,403);assert.equal(f.calls.length,0);
});
