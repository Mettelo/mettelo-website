import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {portfolioQuery,portfolioHref,portfolioEvidenceUrl} from '../lib/member-portfolio.mjs';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const link=uri(`import React from ${JSON.stringify(import.meta.resolve('react'))};export default function Link({children,...props}){return React.createElement('a',props,children)}`);
const lab=uri(`export async function labSession(){const f=globalThis.portfolioFixture;return {user:f.user,db:{rpc:async(name,payload)=>{f.calls.push({name,payload});return {data:f.data,error:f.error}}}}}`);
const navigation=uri(`export function redirect(href){throw Error('REDIRECT:'+href)}`);
async function load(file){let source=ts.transpileModule(await fs.readFile(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace(/import\s+['"][^'"]+\.css['"];?/g,'');
 for(const match of [...source.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const s=match[2];let target=s==='next/link'?link:s==='next/navigation'?navigation:s==='@/lib/lab'?lab:s==='@/lib/member-portfolio.mjs'?new URL('../lib/member-portfolio.mjs',import.meta.url).href:s==='@/components/PortfolioShare'?await load('../components/PortfolioShare.tsx'):s==='@/components/MarketAvatar'?await load('../components/MarketAvatar.tsx'):s==='@/lib/member-portfolio-view'?await load('../lib/member-portfolio-view.ts'):s.endsWith('.css')?uri('export default new Proxy({},{get:(_,key)=>key})'):s.startsWith('.')?await load(new URL(s+'.tsx',new URL(file,import.meta.url)).href):import.meta.resolve(s);source=source.replace(match[0],'from '+JSON.stringify(target));}return uri(source);}
const {default:Page}=await import(await load('../app/member/portfolio/page.tsx'));
const {examplePortfolio}=await import(await load('../lib/member-portfolio-view.ts'));
function fixture(data=examplePortfolio(),overrides={}){return globalThis.portfolioFixture={user:{id:'member'},data,calls:[],...overrides};}
const render=async params=>renderToStaticMarkup(await Page({searchParams:Promise.resolve(params||{})}));
test('portfolio filters and links bound input and preserve search without redirect targets',()=>{
 assert.deepEqual(portfolioQuery({kind:'other',q:['bad'],page:'-1',user_id:'other'}),{kind:'all',q:'',page:1});
 assert.equal(portfolioQuery({q:'x'.repeat(500),page:'1000001'}).q.length,150);assert.equal(portfolioQuery({page:'1000001'}).page,1);
 assert.equal(portfolioHref({kind:'milestone',q:'SQL & <test>'},2),'/member/portfolio?kind=milestone&q=SQL+%26+%3Ctest%3E&page=2');
});
test('evidence links reject scripts, insecure protocols and credential-bearing URLs',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,test','http://example.test','https://user:secret@example.test','//example.test',null])assert.equal(portfolioEvidenceUrl(value),null);
 assert.equal(portfolioEvidenceUrl('https://github.com/example/work'),'https://github.com/example/work');
});
test('portfolio requires sign-in and never accepts a target member identity',async()=>{
 let f=fixture(null,{user:null});await assert.rejects(()=>render({q:'my work'}),/REDIRECT:\/signin\?next=/);assert.equal(f.calls.length,0);
 f=fixture();await render({user_id:'other',kind:'contribution',page:'2',q:'SQL'});assert.deepEqual(f.calls,[{name:'website_member_portfolio',payload:{p_kind:'contribution',p_q:'SQL',p_page:2}}]);
});
test('portfolio renders private evidence, honest review labels, skills and safely escaped text',async()=>{
 const data=examplePortfolio();data.rows[0].title='<script>unsafe</script>';data.rows[0].body='My <b>actual</b> outcome';data.rows[0].url='javascript:alert(1)';fixture(data);const html=await render();
 for(const text of ['Private to you','Member-reported','Reviewed','Team outcome','Skills practised','Your role','Team deliveries'])assert.ok(html.includes(text),text);
 assert.match(html,/&lt;script&gt;unsafe&lt;\/script&gt;/);assert.match(html,/My &lt;b&gt;actual&lt;\/b&gt; outcome/);assert.doesNotMatch(html,/href="javascript:/);assert.match(html,/View Lab record/);assert.match(html,/not published to your profile or Lab Market/);
});
test('a failed source never masquerades as an empty portfolio and empty results give an honest next step',async()=>{
 fixture(null,{error:{message:'PRIVATE DATABASE ERROR'}});let html=await render();assert.match(html,/portfolio could not load/);assert.doesNotMatch(html,/PRIVATE DATABASE ERROR|first contribution/);
 fixture({summary:{contributions:0,milestones:0,deliveries:0,skills:0},skills:[],page:1,page_size:25,total:0,rows:[]});html=await render();assert.match(html,/first contribution/);assert.match(html,/Go to your Labs/);
});
test('portfolio pages preserve search and filters and use the server-clamped page',async()=>{
 const data=examplePortfolio();data.page=2;data.total=55;fixture(data);const html=await render({kind:'contribution',q:'SQL',page:'999'});
 assert.match(html,/Page 2 of 3/);assert.match(html,/kind=contribution&amp;q=SQL&amp;page=3/);assert.match(html,/kind=contribution&amp;q=SQL"/);assert.doesNotMatch(html,/page=998/);
});
test('fictional preview is development-only and never queries or changes real records',async()=>{
 const before=process.env.NODE_ENV;try{process.env.NODE_ENV='production';const f=fixture();let html=await render({preview:'example'});assert.equal(f.calls.length,1);assert.doesNotMatch(html,/fictional records/);
 process.env.NODE_ENV='development';fixture(null);html=await render({preview:'example'});assert.equal(globalThis.portfolioFixture.calls.length,0);assert.match(html,/fictional records/);assert.match(html,/actions disabled/);assert.doesNotMatch(html,/View Lab record/);}finally{process.env.NODE_ENV=before;}
});
