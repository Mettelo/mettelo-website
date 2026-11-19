import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
import sharp from 'sharp';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const next=uri('export class NextResponse extends Response{static json(body,options={}){return new NextResponse(JSON.stringify(body),{...options,headers:{...options.headers,"Content-Type":"application/json"}})}}');
const lab=uri(`export async function labSession(){
 const f=globalThis.contentFixture;
 const storage={from(){return {async upload(path,bytes,options){f.upload={path,bytes,options};return {}},getPublicUrl(path){return {data:{publicUrl:'https://images.example.invalid/'+path}}}}}};
 return {user:f.user,db:{async rpc(){return {data:{roles:f.roles}}},storage}};
}`);
const content=uri(`export async function publicContent(db,key){const f=globalThis.contentFixture;return key==='page:home'?[{key,data:f.home}]:key==='brand:defaults'?[{key,data:f.brand}]:[]}export async function contentAdmin(db,action,payload){const f=globalThis.contentFixture;if(!f.roles)throw {code:'42501'};return {key:payload.key,draft:f.draft||f.home}}`);
const supabase=uri('export async function createServerSupabaseClient(){return {}}');
const origins=uri("export function publicWebsiteOrigin(){return 'https://mettelo.com'};export function profileRequestOriginAllowed(origin){return origin==='http://127.0.0.1:3001'}");
const policy=uri('export function publicIndexingEnabled(){return false}');
async function load(path){let code=ts.transpileModule(await fs.readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const s=match[2],url=s==='next/server'?next:s==='@/lib/lab'?lab:s==='@/lib/site-content'?content:s==='@/lib/supabase/server'?supabase:s==='@/lib/site-origins.mjs'||s==='@/lib/request-origin.mjs'?origins:s==='@/lib/seo-policy.mjs'?policy:s.startsWith('@/')?new URL('../'+s.slice(2),import.meta.url).href:import.meta.resolve(s);code=code.replace(match[0],'from '+JSON.stringify(url));}return import(uri(code))}
const {GET}=await load('../app/api/site-page/route.ts'),{POST:IMAGE}=await load('../app/api/admin/content/images/route.ts');
// A clean checkout has no generated public/_site tree. Exercise the production
// template lookup against a disposable runtime, independent of local build output.
const previousCwd=process.cwd(),runtimeRoot=await fs.mkdtemp(join(tmpdir(),'mettelo-content-api-'));
await fs.mkdir(join(runtimeRoot,'public/_site'),{recursive:true});
await fs.copyFile(new URL('../../../index.html',import.meta.url),join(runtimeRoot,'public/_site/index.html'));
process.chdir(runtimeRoot);
test.after(async()=>{process.chdir(previousCwd);await fs.rm(runtimeRoot,{recursive:true,force:true})});
const fixture=changes=>(globalThis.contentFixture={user:{id:'00000000-0000-4000-8000-000000000001'},roles:true,home:{headline:'Public headline',seo_title:'Public search title'},brand:{},...changes});
test('public HTML uses published fields and staging noindex; a private draft requires administrator access',async()=>{fixture({draft:{headline:'Private draft headline'}});let r=await GET(new Request('http://127.0.0.1:3001/api/site-page?path=/'));assert.equal(r.status,200);assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow');let html=await r.text();assert.match(html,/Public headline/);assert.doesNotMatch(html,/Private draft headline/);r=await GET(new Request('http://127.0.0.1:3001/api/site-page?path=/&preview_key=page:home'));assert.equal(r.status,200);html=await r.text();assert.match(html,/Private draft headline/);assert.match(html,/Private draft preview/);fixture({roles:false});r=await GET(new Request('http://127.0.0.1:3001/api/site-page?path=/&preview_key=page:home'));assert.equal(r.status,403);assert.doesNotMatch(await r.text(),/Private draft headline/);assert.equal((await GET(new Request('http://127.0.0.1:3001/api/site-page?path=../../.env.local'))).status,404)});
test('website image uploads require full administrator access and reject active SVG content',async()=>{fixture({user:null});assert.equal((await IMAGE(new Request('http://127.0.0.1:3001/api/admin/content/images',{method:'POST',headers:{origin:'http://127.0.0.1:3001'}}))).status,401);fixture({roles:false});assert.equal((await IMAGE(new Request('http://127.0.0.1:3001/api/admin/content/images',{method:'POST',headers:{origin:'http://127.0.0.1:3001'}}))).status,403);fixture();const body=new FormData();body.set('image',new File(['<svg onload="alert(1)"></svg>'],'unsafe.svg',{type:'image/svg+xml'}));const r=await IMAGE(new Request('http://127.0.0.1:3001/api/admin/content/images',{method:'POST',headers:{origin:'http://127.0.0.1:3001'},body}));assert.equal(r.status,400);assert.equal(globalThis.contentFixture.upload,undefined)});
test('social image uploads are decoded and converted to 1200x630 WebP with a server-generated path',async()=>{const f=fixture(),body=new FormData(),png=await sharp({create:{width:16,height:16,channels:3,background:'#c6892a'}}).png().toBuffer();body.set('image',new File([png],'source.png',{type:'image/png'}));body.set('purpose','sharing');const r=await IMAGE(new Request('http://127.0.0.1:3001/api/admin/content/images',{method:'POST',headers:{origin:'http://127.0.0.1:3001'},body}));assert.equal(r.status,200);const metadata=await sharp(f.upload.bytes).metadata();assert.deepEqual([metadata.width,metadata.height,metadata.format],[1200,630,'webp']);assert.match(f.upload.path,/^00000000-0000-4000-8000-000000000001\/[0-9a-f-]+\.webp$/);assert.equal(f.upload.options.upsert,false)});
