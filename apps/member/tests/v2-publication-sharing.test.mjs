import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const response=uri("export const NextResponse={json:(body,options)=>Response.json(body,options)}");
const lab=uri("export async function labSession(){const f=globalThis.v2Fixture;return {user:f.user,db:{rpc:async(name,args)=>{f.calls.push({name,args});return f.responses?.[name]||{data:f.data,error:f.error}}}}}");
const social=uri("export async function communityRpc(db,action,payload){const {data,error}=await db.rpc('website_lab_community',{p_action:action,p_payload:payload});if(error)throw error;return data;}");
const origin=uri("export const profileRequestOriginAllowed=o=>o==='https://staging.mettelo.com';export const memberOrigin=()=> 'https://staging.mettelo.com'");
const recruitment=uri('export async function readPublicRecruitment(){return globalThis.recruitmentFixture}');
const publicOrigins=uri("export const publicWebsiteOrigin=()=> 'https://staging.mettelo.com'");
const navigation=uri("export const useRouter=()=>({refresh(){}})");
const link=uri('import React from '+JSON.stringify(import.meta.resolve('react'))+';export default function Link(p){return React.createElement("a",p,p.children)}');
async function load(path){
 let s=ts.transpileModule(await fs.readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/import\s+['"][^'"]+\.css['"];?/g,'');
 for(const m of [...s.matchAll(/from\s+(['"])([^'"]+)\1/g)]){
  const name=m[2],target=name==='next/server'?response:name==='next/link'?link:name==='next/navigation'?navigation:name==='@/lib/lab'?lab:name==='@/lib/market-community'?social:name==='@/lib/shared-recruitment'?recruitment:name==='@/lib/site-origins.mjs'?publicOrigins:name==='@/lib/request-origin.mjs'?origin:name==='@/lib/member-portfolio.mjs'?new URL('../lib/member-portfolio.mjs',import.meta.url).href:name==='@/components/PortfolioProofCard'?await load('../components/PortfolioProofCard.tsx'):import.meta.resolve(name);
  s=s.replace(m[0],'from '+JSON.stringify(target));
 }return uri(s);
}
const messages=await import(await load('../app/api/market-messages/route.ts'));
const share=await import(await load('../app/api/portfolio-sharing/route.ts'));
const recruit=await import(await load('../app/api/recruitment-sharing/route.ts'));
const {default:RecruitmentPage}=await import(await load('../app/collaborate/[token]/page.tsx'));
const publish=await import(await load('../app/api/admin/project-publications/route.ts'));
const {default:Proof}=await import(await load('../components/PortfolioProofCard.tsx'));
const {default:Post}=await import(await load('../components/PortfolioPostText.tsx'));
const {default:Examples}=await import(await load('../app/member/portfolio/examples/page.tsx'));
const fixture=()=>globalThis.v2Fixture={user:{id:'member'},calls:[],data:{ok:true},error:null};
const request=(body,origin='https://staging.mettelo.com')=>new Request('https://staging.mettelo.com/api/test',{method:'POST',headers:{origin},body:JSON.stringify(body)});
test('sharing and publishing reject cross-origin and signed-out requests before any database write',async()=>{
 for(const api of [share,publish,recruit]){let f=fixture();assert.equal((await api.POST(request({},'https://evil.test'))).status,403);assert.equal(f.calls.length,0);f.user=null;assert.equal((await api.POST(request({}))).status,401);assert.equal(f.calls.length,0);}
});
test('share requests cannot select an owner or forge the public feed origin',async()=>{
 const f=fixture();assert.equal((await share.POST(request({action:'create',skills:'SQL, design',owner_id:'someone-else',team_id:'private',summary:'Edited summary'}))).status,200);
 assert.equal(f.calls[0].name,'website_portfolio_sharing');assert.deepEqual(f.calls[0].args.p_payload.skills,['SQL','design']);assert.equal(f.calls[0].args.p_payload.owner_id,undefined);assert.equal(f.calls[0].args.p_payload.team_id,undefined);assert.equal(f.calls[0].args.p_action,'create');
 await share.POST(request({action:'feed',id:'share',origin:'https://evil.test'}));assert.equal(f.calls[1].args.p_payload.origin,'https://staging.mettelo.com');
 assert.equal((await share.POST(request({action:'delete-all'}))).status,400);assert.equal(f.calls.length,2);
 assert.equal((await share.POST(request({action:'create',skills:'x'.repeat(401)}))).status,400);assert.equal(f.calls.length,2);
 f.error={code:'XX000',message:'PRIVATE DATABASE DETAILS'};const result=await share.POST(request({action:'revoke',id:'share'}));assert.equal(result.status,400);assert.doesNotMatch(await result.text(),/PRIVATE DATABASE/);
});
test('administrator publication passes only brief fields and leaves authority to the server guard',async()=>{
 const f=fixture();await publish.POST(request({nonce:'request',skills:'SQL, Python',roles:'Analyst, Engineer',owner_id:'other',reviewed_by:'forged',state:'approved',project_ref:'FORGED'}));
 const p=f.calls[0].args.p_payload;assert.deepEqual(p.roles,['Analyst','Engineer']);assert.deepEqual(p.skills,['SQL','Python']);for(const field of ['owner_id','reviewed_by','state','project_ref'])assert.equal(p[field],undefined);
 f.error={code:'42501',message:'private'};assert.equal((await publish.POST(request({skills:'SQL',roles:'Analyst'}))).status,403);
 assert.equal((await publish.POST(request({skills:['SQL'],roles:'Analyst'}))).status,400);
});
test('proof categories preserve attribution, honest review labels and safe rendered text',()=>{
 const base={title:'<script>unsafe</script>',summary:'Public <b>summary</b>',author_display:'Example',project_context:'',skills:['SQL'],evidence_url:'javascript:alert(1)',created_at:'2026-11-07T10:00:00Z',source_review_state:'reviewed'};
 const contribution=renderToStaticMarkup(React.createElement(Proof,{proof:{...base,kind:'contribution'}}));assert.match(contribution,/What I contributed and its outcome/);assert.match(contribution,/&lt;script&gt;/);assert.doesNotMatch(contribution,/href="javascript:/);
 const milestone=renderToStaticMarkup(React.createElement(Proof,{proof:{...base,kind:'milestone',source_review_state:'acceptance-recorded'}}));assert.match(milestone,/acceptance recorded/);assert.doesNotMatch(milestone,/acceptance by another reviewer/);assert.match(milestone,/not been independently reviewed or certified/);
 const delivery=renderToStaticMarkup(React.createElement(Proof,{proof:{...base,kind:'delivery',individual_part:'My personal part'}}));assert.match(delivery,/What the team delivered/);assert.match(delivery,/My individual contribution/);assert.match(delivery,/My personal part/);
});
test('all example categories are fictional and do not publish or create share links',async()=>{
 for(const kind of ['contribution','milestone','delivery']){const html=renderToStaticMarkup(await Examples({searchParams:Promise.resolve({kind})}));assert.match(html,new RegExp('data-kind="'+kind+'"'));assert.match(html,/Fictional example/);assert.doesNotMatch(html,/href="[^"]*\/proof\/|Publish post|Publish project/);}
});
test('feed proof links are clickable only for approved Mettelo origins, with other text escaped',()=>{
 const token='10000000-0000-4000-8000-000000000123';
 const html=renderToStaticMarkup(React.createElement(Post,{text:'<script>alert(1)</script> https://staging.mettelo.com/proof/'+token+' https://evil.test/proof/'+token}));
 assert.match(html,/href="https:\/\/staging.mettelo.com\/proof\//);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/href="https:\/\/evil/);
});
test('recruitment sharing forwards only the selected Lab and explicit confirmation',async()=>{
 const f=fixture(),team='10000000-0000-4000-8000-000000000123';
 assert.equal((await recruit.POST(request({action:'enable',team_id:team,approved_public:true,approved_by:'forged',snapshot:{description:'forged'}}))).status,200);
 assert.deepEqual(f.calls[0],{name:'website_recruitment_sharing',args:{p_action:'enable',p_payload:{team_id:team,approved_public:true}}});
 assert.equal((await recruit.POST(request({action:'resolve',team_id:team}))).status,400);
 assert.equal((await recruit.POST(request({action:'enable',team_id:'invalid'}))).status,400);assert.equal(f.calls.length,1);
 f.error={code:'42501',message:'PRIVATE AUTH DETAILS'};const denied=await recruit.POST(request({action:'enable',team_id:team}));assert.equal(denied.status,403);assert.doesNotMatch(await denied.text(),/PRIVATE AUTH/);
});
test('public recruitment shows only the selected summary and directs joining through member checks',async()=>{
 const token='10000000-0000-4000-8000-000000000123';
 globalThis.recruitmentFixture={title:'<script>unsafe</script>',project_ref:'EXAMPLE-DA-001',description:'Selected public recruitment summary.',roles:['Analyst'],skills:['SQL'],commitment:'Two hours weekly',available:2,private_notes:'DO NOT RENDER',repository_url:'PRIVATE REPOSITORY'};
 let html=renderToStaticMarkup(await RecruitmentPage({params:Promise.resolve({token})}));assert.match(html,/&lt;script&gt;/);assert.match(html,/Selected public recruitment summary/);assert.match(html,new RegExp('/member/market/recruitment/'+token));assert.match(html,/does not grant Lab or repository access/);assert.doesNotMatch(html,/DO NOT RENDER|PRIVATE REPOSITORY/);
 globalThis.recruitmentFixture=null;html=renderToStaticMarkup(await RecruitmentPage({params:Promise.resolve({token})}));assert.match(html,/no longer available/);assert.doesNotMatch(html,/request to collaborate/);
});
test('message-panel reads require sign-in, bound pages and ignore a caller-supplied identity',async()=>{
 const f=fixture();f.user=null;assert.equal((await messages.GET(new Request('https://staging.mettelo.com/api/market-messages'))).status,401);assert.equal(f.calls.length,0);
 f.user={id:'member'};assert.equal((await messages.GET(new Request('https://staging.mettelo.com/api/market-messages?conversation_id=invalid'))).status,400);assert.equal(f.calls.length,0);
 f.data={rows:[]};const response=await messages.GET(new Request('https://staging.mettelo.com/api/market-messages?page=999999&user_id=other'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(f.calls[0],{name:'website_lab_community',args:{p_action:'conversations',p_payload:{page:100000}}});assert.equal((await response.json()).user_id,'member');
});
test('message-panel selection reuses participant-only conversations and redacts private failures',async()=>{
 const f=fixture(),target='10000000-0000-4000-8000-000000000123',cid='10000000-0000-4000-8000-000000000124';
 f.responses={website_market_conversation_with:{data:{conversation_id:cid},error:null},website_lab_community:{data:{conversation:{id:cid,state:'accepted',name:'Example peer'},messages:[{id:'message',body:'An authorised reply'}]},error:null}};
 const response=await messages.GET(new Request('https://staging.mettelo.com/api/market-messages?member_id='+target));assert.equal(response.status,200);assert.deepEqual(f.calls.map(c=>c.name),['website_market_conversation_with','website_lab_community']);assert.deepEqual(f.calls[1].args.p_payload,{conversation_id:cid});assert.equal((await response.json()).messages[0].body,'An authorised reply');
 f.responses.website_market_conversation_with={data:null,error:{code:'42501',message:'PRIVATE CONTACT DETAILS'}};
 const denied=await messages.GET(new Request('https://staging.mettelo.com/api/market-messages?member_id='+target));assert.equal(denied.status,503);assert.doesNotMatch(await denied.text(),/PRIVATE CONTACT/);
});
