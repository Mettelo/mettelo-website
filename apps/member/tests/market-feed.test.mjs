import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {appendFeedPage,feedReadQuery} from '../lib/market-feed.mjs';
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const lab=data(`export async function labSession(){return {user:globalThis.feedFixture.user,db:{storage:{from(){return {async download(){return globalThis.feedFixture.photo||{data:null,error:true}}}}}}}}`);
const social=data(`export const marketRpc=(...args)=>communityRpc(...args);export async function communityRpc(db,action,payload){const f=globalThis.feedFixture;f.calls.push({action,payload});if(f.error)throw f.error;return f.result||{rows:[]}}`);
const discovery=data(`export async function discoveryRpc(db,action,payload){const f=globalThis.feedFixture;f.discoveryCalls??=[];f.discoveryCalls.push({action,payload});if(f.discoveryError)throw Error("Private database error");return f.project||{}}`);
const proposals=data(`export async function proposalRpc(){const f=globalThis.feedFixture;return {proposal:f.proposal}}`);
const origin=data(`export function profileRequestOriginAllowed(origin){return origin==='http://127.0.0.1:3001'}`);
const next=data(`export const NextResponse={json(body,options={}){return new Response(JSON.stringify(body),{...options,headers:{...options.headers,'Content-Type':'application/json'}})},redirect(url,status=307){return new Response(null,{status,headers:{Location:String(url)}})}}`);
async function route(path){let source=ts.transpileModule(await fs.readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...source.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const s=match[2],target=s==='@/lib/lab'?lab:s==='@/lib/lab-market'?social:s==='@/lib/market-discovery'?discovery:s==='@/lib/market-proposals'?proposals:s==='@/lib/market-community'?social:s==='@/lib/request-origin.mjs'?origin:s==='@/lib/market-feed.mjs'?new URL('../lib/market-feed.mjs',import.meta.url).href:s==='next/server'?next:null;if(!target)throw Error('Unexpected import '+s);source=source.replace(match[0],'from '+JSON.stringify(target));}
 return import(data(source));
}
const {GET}=await route('../app/api/market-feed/route.ts'),{POST}=await route('../app/api/market-community/route.ts');
const {POST:MARKET}=await route('../app/api/lab-market/route.ts');
const {GET:DETAIL}=await route('../app/api/market-detail/route.ts');
const {GET:AVATAR}=await route('../app/api/market-avatar/route.ts');
const {GET:PEOPLE}=await route('../app/api/market-people/route.ts');
function fixture(overrides={}){globalThis.feedFixture={user:{id:'member'},calls:[],...overrides};return globalThis.feedFixture;}
function post(action,fields={},json=true,origin='http://127.0.0.1:3001'){return new Request('http://127.0.0.1:3001/api/market-community',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded',Accept:json?'application/json':'text/html'},body:new URLSearchParams({action,...fields})});}
test('feed cursor reads reject malformed pairs and ignore client-supplied mutation actions',()=>{
 assert.throws(()=>feedReadQuery(new URLSearchParams({before_id:'not-a-cursor'})));
 assert.throws(()=>feedReadQuery(new URLSearchParams({before_at:'infinity',before_id:'00000000-0000-4000-8000-000000000001'})));
 const read=feedReadQuery(new URLSearchParams({q:'x'.repeat(200),view:'following',action:'delete_post',user_id:'someone-else'}));
 assert.equal(read.action,'feed');assert.equal(read.payload.q.length,150);assert.equal(read.payload.view,'following');assert.equal(read.payload.user_id,undefined);
});
test('overlapping 25-post pages append in order without duplicate posts or replacing existing content',()=>{
 const current=Array.from({length:25},(_,i)=>({id:String(i),body:'Original '+i})),next=Array.from({length:26},(_,i)=>({id:String(i+24),body:'New '+i}));
 const combined=appendFeedPage(current,next);assert.equal(combined.length,50);assert.equal(combined[24].body,'Original 24');assert.equal(combined[25].id,'25');assert.equal(new Set(combined.map(p=>p.id)).size,50);
});
test('feed endpoint requires verified sign-in and valid cursors before calling the data source',async()=>{
 let f=fixture({user:null});assert.equal((await GET(new Request('http://127.0.0.1:3001/api/market-feed'))).status,401);assert.equal(f.calls.length,0);
 f=fixture();assert.equal((await GET(new Request('http://127.0.0.1:3001/api/market-feed?before_id=invalid'))).status,400);assert.equal(f.calls.length,0);
});
test('feed and lazy discussion reads are private, bounded RPC projections with honest source failures',async()=>{
 const f=fixture({result:{rows:[{id:'post'}],page_size:25}}),response=await GET(new Request('http://127.0.0.1:3001/api/market-feed?view=following&q=SQL&action=reports'));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(f.calls,[{action:'feed',payload:{q:'SQL',view:'following'}}]);
 fixture({error:{message:'Internal secret database failure'}});const failed=await GET(new Request('http://127.0.0.1:3001/api/market-feed?post_id=00000000-0000-4000-8000-000000000001'));assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/Internal secret/);
});
test('inline post actions keep existing authentication/origin guards and return confirmed JSON results',async()=>{
 let f=fixture();assert.equal((await POST(post('like',{},true,'https://outside.example'))).status,403);assert.equal(f.calls.length,0);
 f=fixture({user:null});assert.equal((await POST(post('like'))).status,401);assert.equal(f.calls.length,0);
 f=fixture({result:{ok:true}});const response=await POST(post('like',{post_id:'post',enabled:'true',administrator:'true'}));assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,result:{ok:true}});assert.equal(f.calls[0].payload.administrator,undefined);assert.equal(f.calls[0].payload.enabled,true);
});
test('inline failures preserve backend permission decisions and ordinary forms retain safe redirects',async()=>{
 fixture({error:{code:'42501',message:'Only the author can remove this post'}});const denied=await POST(post('delete_post',{post_id:'post'}));assert.equal(denied.status,403);assert.match((await denied.json()).error,/Only the author/);
 fixture({result:{post_id:'00000000-0000-4000-8000-000000000001'}});const ordinary=await POST(post('publish',{return_view:'https://outside.example'},false));assert.equal(ordinary.status,303);assert.equal(new URL(ordinary.headers.get('location')).origin,'http://127.0.0.1:3001');
});

test('feed category filters survive paging and cannot select private operations',()=>{
 const result=feedReadQuery(new URLSearchParams({category:'ideas',view:'following',action:'reports',before_at:'2026-11-07T12:00:00Z',before_id:'00000000-0000-4000-8000-000000000001'}));
 assert.equal(result.action,'feed');assert.equal(result.payload.category,'ideas');assert.equal(result.payload.view,'following');assert.ok(result.payload.before_id);
 assert.equal(feedReadQuery(new URLSearchParams({category:'private_drafts'})).payload.category,undefined);
});
test('drawer reads authenticate, reject private proposals and strip review fields even for the owner',async()=>{
 const url='http://127.0.0.1:3001/api/market-detail?kind=proposal&id=00000000-0000-4000-8000-000000000001';
 fixture({user:null});assert.equal((await DETAIL(new Request(url))).status,401);
 fixture({proposal:{state:'draft',review_note:'PRIVATE'}});assert.equal((await DETAIL(new Request(url))).status,404);
 fixture({proposal:{id:'proposal',title:'Public title',state:'approved',description:'Public description',review_note:'PRIVATE',owner_id:'member',reviewed_by:'admin'}});const result=await DETAIL(new Request(url));assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');const body=await result.text();assert.match(body,/Public description/);assert.doesNotMatch(body,/review_note|reviewed_by|owner_id|PRIVATE/);
});

test('sharing preferences save back to the profile without accepting a supplied external return target',async()=>{
 fixture();let response=await MARKET(new Request('http://127.0.0.1:3001/api/lab-market',{method:'POST',headers:{Origin:'http://127.0.0.1:3001','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action:'preferences',return_to:'profile',discoverable:'true',share_details:'true'})}));
 assert.equal(response.status,303);let target=new URL(response.headers.get('location'));assert.equal(target.pathname,'/member/profile');assert.equal(target.hash,'#market-visibility');assert.equal(globalThis.feedFixture.calls[0].payload.contactable,false);
 fixture();response=await MARKET(new Request('http://127.0.0.1:3001/api/lab-market',{method:'POST',headers:{Origin:'http://127.0.0.1:3001','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action:'preferences',return_to:'https://outside.example'})}));target=new URL(response.headers.get('location'));assert.equal(target.origin,'http://127.0.0.1:3001');assert.equal(target.pathname,'/member/market');
});

test('avatar reads validate identity, use only the authorised path and send private image responses',async()=>{
 const base='http://127.0.0.1:3001/api/market-avatar?member_id=',id='00000000-0000-4000-8000-000000000001';
 fixture();assert.equal((await AVATAR(new Request(base+'invalid'))).status,400);
 fixture({user:null});assert.equal((await AVATAR(new Request(base+id))).status,401);
 fixture({project:{}});assert.equal((await AVATAR(new Request(base+id))).status,404);
 fixture({project:{path:'authorised/photo.webp'},photo:{data:new Blob(['image fixture']),error:null}});const response=await AVATAR(new Request(base+id));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/webp');assert.equal(response.headers.get('cache-control'),'private, no-store');
 fixture({discoveryError:true});const denied=await AVATAR(new Request(base+id));assert.equal(denied.status,404);assert.equal(await denied.text(),'');
});
test('connection reads authenticate, bound pages and cannot select arbitrary discovery actions',async()=>{
 const base='http://127.0.0.1:3001/api/market-people?member_id=',id='00000000-0000-4000-8000-000000000001';
 fixture({user:null});assert.equal((await PEOPLE(new Request(base+id))).status,401);fixture();assert.equal((await PEOPLE(new Request(base+'invalid'))).status,400);
 const f=fixture({project:{followers:1,following:0,rows:[]}});const result=await PEOPLE(new Request(base+id+'&action=avatar&direction=unknown&page=9999999'));assert.equal(result.status,200);assert.deepEqual(f.discoveryCalls,[{action:'connections',payload:{member_id:id,direction:'followers',page:10000}}]);assert.equal(result.headers.get('cache-control'),'private, no-store');
 fixture({discoveryError:true});const failed=await PEOPLE(new Request(base+id));assert.equal(failed.status,403);assert.doesNotMatch(await failed.text(),/Private database/);
});
