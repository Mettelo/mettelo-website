import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const cache=new Map(),data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const lab=data(`export async function labSession(){return {user:{id:'member'},db:{}}}export async function labRpc(){return {used:3,allowance:3,available:0,active:2,reserved:0,paused:1,revoking:0}}`);
const market=data(`export async function marketRpc(db,action){const f=globalThis.marketFixture;if(f.fail===action)throw Error('unavailable');if(action==='my_labs')return f.labs||[];if(action==='preferences')return {discoverable:false,contactable:false};if(action==='manage')return f.management;return f.listing;}`);
const social=data(`export const discoveryRpc=()=>Promise.resolve({rows:[]});export async function communityRpc(){return {rows:[]}}`);
const nextLink=data(`import {createElement} from 'react';export default function Link({href,children,onClick,...props}){return createElement('a',{...props,href,onClick},children)}` .replace("from 'react'",'from '+JSON.stringify(import.meta.resolve('react'))));
const navigation=data(`export function redirect(url){throw Error('REDIRECT:'+url)}`);
async function local(url){
 if(cache.has(url.href))return cache.get(url.href);
 let code=ts.transpileModule(await fs.readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText.replace(/import\s+['"][^'"]+\.css['"];?/g,'');
 for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){
  const s=m[2];let target;
  if(s==='@/lib/lab')target=lab;else if(s==='@/lib/lab-market')target=market;else if(s==='@/lib/market-community')target=social;else if(s==='@/lib/market-discovery')target=social;else if(s==='next/navigation')target=navigation;else if(s==='next/link')target=nextLink;
  else if(s.startsWith('@/')||s.startsWith('.')){const base=s.startsWith('@/')?new URL('../'+s.slice(2),import.meta.url):new URL(s,url);let found;if(s.endsWith('.mjs'))found=base;for(const ext of found?[]:['.tsx','.ts'])try{const candidate=new URL(base.href+ext);await fs.access(candidate);found=candidate;break;}catch{}if(!found)throw Error('Unresolved '+s);target=await local(found);}
  else target=import.meta.resolve(s);
  code=code.replace(m[0],`from ${JSON.stringify(target)}`);
 }
 const result=data(code);cache.set(url.href,result);return result;
}
const {default:Page}=await import(await local(new URL('../app/member/market/page.tsx',import.meta.url)));
async function render(tab,fixture={},query={}){globalThis.marketFixture={listing:{rows:[],page:1,page_size:25,total:0},...fixture};return renderToStaticMarkup(await Page({searchParams:Promise.resolve({tab,...query})}));}
test('legacy project directory opens the unified project feed and preserves search',async()=>{
 await assert.rejects(()=>render('projects',{}, {q:'SQL'}),/REDIRECT:\/member\/market\?category=projects&q=SQL/);
});
test('people discovery honours opt-in controls and offers invitations only through advertised leader roles',async()=>{
 const person={id:'candidate',full_name:'Candidate',username:'candidate',headline:'Analyst',skills:['SQL'],contactable:true};
 assert.doesNotMatch(await render('people',{listing:{rows:[person],total:1}}),/Send invitation/);
 const html=await render('people',{listing:{rows:[person],total:1},labs:[{team_id:'lab',title:'Example Lab',roles:['Analyst']}]});
 assert.match(html,/Send invitation/);assert.doesNotMatch(html,/name="contactable"|Your discovery and invitation preferences/);assert.doesNotMatch(html,/@example\.invalid/);
});
test('recipient invitation controls differ from an ordinary member awaiting a leader decision',async()=>{
 const record={id:'request',team_id:'lab',kind:'invitation',member_id:'member',initiated_by:'leader',role:'Analyst',proposal:'Example invitation',commitment:'Two hours weekly',state:'pending',expires_at:'2026-11-20T12:00:00Z',title:'Example Lab',member_name:'Member',can_manage:false};
 assert.match(await render('requests',{listing:{rows:[record]}}),/Accept invitation/);
 const html=await render('requests',{listing:{rows:[{...record,kind:'request',initiated_by:'member'}]}});
 assert.doesNotMatch(html,/Accept collaborator/);assert.match(html,/Withdraw/);
});
test('capacity administration does not accidentally expose leader-only recruitment controls',async()=>{
 const management={team_id:'lab',can_manage:false,can_set_capacity:true,catalogue_roles:['Analyst'],occupied:0,recruitment:null,members:[]};
 const html=await render('manage',{management},{team:'lab'});assert.match(html,/Save approved capacity/);assert.doesNotMatch(html,/Save &amp; update feed listing/);
});
test('leader management retains reasoned removal and does not offer a self-service capacity increase',async()=>{
 const management={team_id:'lab',can_manage:true,can_set_capacity:false,catalogue_roles:['Analyst'],occupied:1,recruitment:{open:true,collaborator_capacity:1,description:'Public summary',roles:['Analyst'],skills:['SQL'],commitment:'Two hours weekly'},members:[{user_id:'candidate',name:'Candidate',role:'Analyst',status:'confirmed',revocation_pending:false}]};
 const html=await render('manage',{management},{team:'lab'});assert.match(html,/Save &amp; update feed listing/);assert.match(html,/name="reason"/);assert.match(html,/Confirm removal and revoke Lab access/);assert.doesNotMatch(html,/Save approved capacity/);
});
test('a discovery failure is an error rather than a false empty directory',async()=>{
 const html=await render('people',{fail:'people'});assert.match(html,/Market records could not load/);assert.doesNotMatch(html,/No discoverable members match/);
});
