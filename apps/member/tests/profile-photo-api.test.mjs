import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import sharp from 'sharp';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const next=uri('export class NextResponse extends Response{static json(body,options={}){return new NextResponse(JSON.stringify(body),{...options,headers:{...options.headers,"Content-Type":"application/json"}})}}');
const db=uri(`export async function createServerSupabaseClient(){const f=globalThis.photoFixture;return {auth:{async getUser(){return {data:{user:f.user}}}},from(){const query={select(){return this},eq(){return this},is(){return this},async single(){return {data:{avatar_path:f.previous},error:null}},update(value){f.next=value.avatar_path;return this},async maybeSingle(){return f.conflict?{data:null,error:null}:{data:{avatar_path:f.next},error:null}}};return query},storage:{from(bucket){return {async upload(path,bytes,options){f.uploads.push({bucket,path,bytes,options});return {error:f.uploadError||null}},async remove(paths){f.removals.push(...paths);return {error:null}}}}}}}`);
const origin=uri("export function profileRequestOriginAllowed(value){return value==='http://127.0.0.1:3001'}");
let code=ts.transpileModule(await fs.readFile(new URL('../app/api/profile/avatar/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const s=m[2],target=s==='next/server'?next:s==='@/lib/supabase/server'?db:s==='@/lib/request-origin.mjs'?origin:s.startsWith('@/')?new URL('../'+s.slice(2),import.meta.url).href:import.meta.resolve(s);code=code.replace(m[0],'from '+JSON.stringify(target));}
const {POST}=await import(uri(code));
const user={id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-11-23'};
const fixture=changes=>(globalThis.photoFixture={user,previous:user.id+'/old.webp',uploads:[],removals:[],...changes});
const image=await sharp({create:{width:30,height:20,channels:3,background:'#2A2F52'}}).png().toBuffer();
function request(bytes=image,type='image/png',extra={}){const form=new FormData();form.set('avatar',new File([bytes],'photo',{type}));return new Request('http://127.0.0.1:3001/api/profile/avatar',{method:'POST',headers:{origin:'http://127.0.0.1:3001',...extra},body:form});}
test('photo route rejects foreign origins, unverified users, oversize, unsupported and corrupt files before storage',async()=>{
 let f=fixture();assert.equal((await POST(request(image,'image/png',{origin:'https://foreign.example'}))).status,403);assert.equal(f.uploads.length,0);
 f=fixture({user:{id:user.id}});assert.equal((await POST(request())).status,401);assert.equal(f.uploads.length,0);
 for(const [bytes,type,status] of [[Buffer.alloc(5*1024*1024+1),'image/png',400],[image,'image/svg+xml',400],[Buffer.from('invalid'),'image/png',400]]){f=fixture();assert.equal((await POST(request(bytes,type))).status,status);assert.equal(f.uploads.length,0);}
});
test('valid image is decoded and converted to an owned WebP before atomically replacing the old reference',async()=>{
 const f=fixture(),r=await POST(request());assert.equal(r.status,200);assert.equal(f.uploads.length,1);
 const uploaded=f.uploads[0];assert.equal(uploaded.bucket,'website-profile-photos');assert.ok(uploaded.path.startsWith(user.id+'/'));assert.equal(uploaded.options.contentType,'image/webp');assert.equal((await sharp(uploaded.bytes).metadata()).format,'webp');assert.deepEqual(f.removals,[f.previous]);assert.equal(r.headers.get('cache-control'),'private, no-store');
});
test('storage denial preserves the old photo and a concurrent replacement cleans up only the new upload',async()=>{
 let f=fixture({uploadError:{statusCode:'403',name:'StorageApiError'}}),r=await POST(request());assert.equal(r.status,403);assert.match((await r.json()).error,/Sign in again/);assert.deepEqual(f.removals,[]);assert.equal(f.next,undefined);
 f=fixture({conflict:true});r=await POST(request());assert.equal(r.status,409);assert.deepEqual(f.removals,[f.uploads[0].path]);assert.ok(!f.removals.includes(f.previous));
});

