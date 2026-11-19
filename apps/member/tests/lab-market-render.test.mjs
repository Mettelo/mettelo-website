import {resolveUiIcon} from './helpers/ui-icon-module.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const cache=new Map(),data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const lab=data(`export async function labSession(){return {user:{id:'member'},db:{rpc:async()=>({data:null,error:null})}}}export async function labRpc(db,action){if(action==='mine')return globalThis.marketFixture.cards||[];return {used:3,allowance:3,available:0,active:2,reserved:0,paused:1,revoking:0}}`);
const market=data(`export async function marketRpc(db,action){const f=globalThis.marketFixture;if(f.fail===action)throw Error('unavailable');if(action==='my_labs')return f.labs||[];if(action==='preferences')return {discoverable:false,contactable:false};if(action==='manage')return f.management;return f.listing;}`);
const social=data(`export const discoveryRpc=()=>Promise.resolve({rows:[]});export async function communityRpc(){return {rows:[]}}`);
const nextLink=data(`import {createElement} from 'react';export default function Link({href,children,onClick,...props}){return createElement('a',{...props,href,onClick},children)}` .replace("from 'react'",'from '+JSON.stringify(import.meta.resolve('react'))));
const navigation=data(`export function redirect(url){throw Error('REDIRECT:'+url)}`);
async function local(url){
 if(cache.has(url.href))return cache.get(url.href);
 let code=ts.transpileModule(await fs.readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from\s+['"](?:@\/components\/|\.\/)AppIcon['"]/g,match=>resolveUiIcon(match)).replace(/import\s+['"][^'"]+\.css['"];?/g,'');
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
 const html=await render('manage',{management},{team:'lab'});assert.match(html,/Save approved capacity/);assert.doesNotMatch(html,/Save recruitment/);
});
test('leader management retains reasoned removal and does not offer a self-service capacity increase',async()=>{
 const management={team_id:'lab',can_manage:true,can_set_capacity:false,catalogue_roles:['Analyst'],occupied:1,recruitment:{open:true,collaborator_capacity:1,description:'Public summary',roles:['Analyst'],skills:['SQL'],commitment:'Two hours weekly'},members:[{user_id:'candidate',name:'Candidate',role:'Analyst',status:'confirmed',revocation_pending:false}]};
 const html=await render('manage',{management},{team:'lab'});assert.match(html,/Save recruitment/);assert.match(html,/name="reason"/);assert.match(html,/Confirm removal and revoke Lab access/);assert.doesNotMatch(html,/Save approved capacity/);
});

test('unapproved recruitment explains the block before exposing fields or a publishing checkbox',async()=>{
 const management={team_id:'lab',can_manage:true,can_set_capacity:false,catalogue_roles:['Analyst'],occupied:0,recruitment:null,members:[]};
 const html=await render('manage',{management,labs:[{team_id:'lab',label:'TEST-S01',title:'Example Lab',project_ref:'TEST'}],cards:[{team_id:'lab',label:'TEST-S01',title:'Example Lab',team_status:'active',confirmed:1,collaborators:0}]},{team:'lab'});
 assert.match(html,/Collaborator capacity needs approval/);assert.match(html,/Contact Mettelo support/);assert.match(html,/Current members/);
 assert.doesNotMatch(html,/name="description"|name="open"|name="capacity"|Save recruitment/);
 assert.doesNotMatch(html,/Build a connection|of 3 Lab slots used/);
});

test('missing capacity is not presented as an invented zero and failed metadata does not crash management',async()=>{
 const html=await render('manage',{management:{team_id:'lab',can_manage:true,can_set_capacity:false,catalogue_roles:[],occupied:undefined,recruitment:{open:false},members:[]}},{team:'lab'});
 assert.match(html,/Capacity could not be confirmed/);assert.match(html,/Unavailable/);assert.doesNotMatch(html,/name="open"|Save recruitment/);
});

test('private recruitment stays selected under activity and the shared allowance preserves full-limit guidance',async()=>{
 const html=await render('manage',{management:{team_id:'lab',can_manage:false,can_set_capacity:true,catalogue_roles:[],occupied:0,recruitment:null,members:[]}},{team:'lab'});
 assert.ok((html.match(/<a\b[^>]*>/g)||[]).some(tag=>tag.includes('href="/member/market?tab=requests"')&&tag.includes('aria-current="page"')));
 const people=await render('people');assert.match(people,/3 of 3 Lab slots used/);assert.match(people,/0 available/);assert.match(people,/You can still browse projects, use permitted messages/);
});

test('approved full recruitment retains closing/editing and explains why it is absent from discovery',async()=>{
 const html=await render('manage',{management:{team_id:'lab',can_manage:true,can_set_capacity:false,catalogue_roles:['Analyst'],occupied:1,recruitment:{open:true,collaborator_capacity:1,description:'Public summary',roles:['Analyst'],skills:[],commitment:'Weekly'},members:[]}},{team:'lab'});
 assert.match(html,/No places available/);assert.match(html,/will not appear in discovery/);assert.match(html,/name="open"/);assert.match(html,/Save recruitment/);
});
test('a discovery failure is an error rather than a false empty directory',async()=>{
 const html=await render('people',{fail:'people'});assert.match(html,/Connect records could not load/);assert.doesNotMatch(html,/No discoverable members match/);
});

test('discovery keeps the primary destinations visible and previews skills without expanding every profile',async()=>{
 const person={id:'candidate',full_name:'Candidate',username:'candidate',headline:'Analyst',skills:['SQL','Python','Research','Design','Power BI','Governance'],contactable:true,following:true};
 const html=await render('people',{listing:{rows:[person],total:1}});
 assert.match(html,/aria-label="Mettelo Connect navigation"/);
 assert.match(html,/<a[^>]+aria-current="page"[^>]+href="\/member\/market\?tab=people"/);
 assert.match(html,/aria-label="Unfollow Candidate"/);assert.match(html,/aria-pressed="true"/);
 assert.match(html,/<summary>\+2 more skills<\/summary>/);assert.doesNotMatch(html,/<details open/);
 assert.match(html,/peopleCardActions/);assert.doesNotMatch(html,/Connect menu/);
});

test('invitation form stays in a labelled dialog and self profiles have no self-contact actions',async()=>{
 const person={id:'candidate',full_name:'Candidate',skills:[],contactable:true};
 const html=await render('people',{listing:{rows:[person,{...person,id:'member',full_name:'Me'}],total:2},labs:[{team_id:'lab',title:'Active Lab',roles:['Analyst']}]});
 assert.match(html,/Invite to a Lab/);assert.match(html,/<dialog[^>]+aria-labelledby=/);assert.match(html,/action="\/api\/lab-market"/);
 assert.match(html,/name="lab_role"/);assert.match(html,/Your community profile/);assert.doesNotMatch(html,/Follow Me|Unfollow Me/);
});
