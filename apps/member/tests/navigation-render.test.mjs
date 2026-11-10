import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const nextLink=uri(`import React from ${JSON.stringify(import.meta.resolve('react'))};export default function Link({children,...props}){return React.createElement('a',props,children)}`);
const navigation=uri(`export const usePathname=()=>'/member/lab';`);
const cache=new Map();
async function component(file){
 if(cache.has(file))return cache.get(file);
 let source=await fs.readFile(new URL(file,import.meta.url),'utf8');
 source=source.replace(/import\s+['"][^'"]+\.css['"];?/g,'');
 source=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 for(const match of [...source.matchAll(/from\s+(['"])([^'"]+)\1/g)]){
  const spec=match[2];let target;
  if(spec==='next/link')target=nextLink;
  else if(spec==='next/navigation')target=navigation;
  else if(spec.endsWith('.json'))target=uri('export default '+await fs.readFile(new URL(spec,new URL(file,import.meta.url)),'utf8'));
  else if(spec==='@/lib/site-origins.mjs')target=new URL('../lib/site-origins.mjs',import.meta.url).href;
  else if(spec.startsWith('.'))target=await component(new URL(spec+'.tsx',new URL(file,import.meta.url)).href);
  else target=import.meta.resolve(spec);
  source=source.replace(match[0],'from '+JSON.stringify(target));
 }
 const target=uri(source);cache.set(file,target);return target;
}
const {default:Account}=await import(await component('../components/AccountMenu.tsx'));
const {default:Member}=await import(await component('../components/MemberNavigation.tsx'));
const {default:Admin}=await import(await component('../components/AdminNavigation.tsx'));
const account={name:'Member',fullName:'Example Member',avatar:null,administration:false};
const render=(C,props)=>renderToStaticMarkup(React.createElement(C,props));
test('public, member and Lab account menus keep the same gateway and account destinations',()=>{
 for(const context of ['public','member']){
  const html=render(Account,{account,context});
  for(const path of ['/member','/member/profile','/member/account'])assert.equal((html.match(new RegExp('href="'+path+'"','g'))||[]).length,1);
  assert.doesNotMatch(html,/href="\/member\/(?:lab|applications|market)"/);
  assert.doesNotMatch(html,/href="\/admin"/);
  assert.match(html,/action="\/auth\/signout" method="post"/);
 }
 assert.match(render(Account,{account,context:'member'}),/Explore Mettelo/);
 assert.equal((render(Account,{account,context:'public',inline:true,children:React.createElement('span',null,'Public destinations')}).match(/Public destinations/g)||[]).length,1);
 assert.match(render(Account,{account:{...account,administration:true}}),/href="\/admin"/);
});
test('member navigation retains project, community and support destinations',()=>{
 const html=render(Member,{});
 for(const path of ['/member','/member/lab','/member/portfolio','/member/market','/member/resources','/member/enquiries'])assert.ok(html.includes('href="'+path+'"'));
 assert.match(html,/href="\/member\/lab" aria-current="page"/);
});
test('admin navigation still gates each area by capability',()=>{
 const html=render(Admin,{capabilities:{operations:false,news:true,opportunities:false}});
 assert.match(html,/href="\/admin\/news"/);assert.doesNotMatch(html,/href="\/admin\/(?:projects|members|opportunities)"/);
});
test('focused Lab exposes member home and My Labs at every viewport with distinct Overview',async()=>{
 const page=await fs.readFile(new URL('../app/member/lab/[teamId]/page.tsx',import.meta.url),'utf8');
 assert.match(page,/<nav className="labReturnNav"[^>]*><Link href="\/member">Member home<\/Link>/);
 assert.match(page,/<Link href="\/member\/lab">My Labs<\/Link>/);
 const nav=await fs.readFile(new URL('../components/lab/MetteloLabNavigation.tsx',import.meta.url),'utf8');
 assert.equal((nav.match(/view:'home',label:'Overview'/g)||[]).length,2);
 const css=await fs.readFile(new URL('../app/member/lab/lab.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/\.labReturnNav\s*\{[^}]*display:\s*none/);
});
test('static and runtime menus share their generated destination contract and stable initial mobile layout',async()=>{
 const config=JSON.parse(await fs.readFile(new URL('../../../shared/navigation.json',import.meta.url),'utf8'));
 const snapshot=JSON.parse(await fs.readFile(new URL('../components/navigation.snapshot.json',import.meta.url),'utf8'));
 assert.deepEqual(config,snapshot);assert.deepEqual(config.workspace.map(i=>i.href),['/member']);
 const css=await fs.readFile(new URL('../../../shared/navigation.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/:not\(\[data-interactive\]\)/);
});
