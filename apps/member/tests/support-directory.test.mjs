import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {supportFilters,supportHref} from '../lib/support-directory.mjs';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const react=JSON.stringify(import.meta.resolve('react'));
const link=uri('import {createElement} from '+react+';export default function Link({href,children,...props}){return createElement("a",{href,...props},children)}');
const icon=uri('export default ()=>null');
const labels=uri('export const enquiryStatus={new:{label:"Received",tone:"neutral"}};export const reasonLabel=key=>key;');
let code=ts.transpileModule(await fs.readFile(new URL('../components/lab/SupportInbox.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText.replace(/import\s+['"][^'"]+\.css['"];?/g,'');
for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const s=m[2],target=s==='next/link'?link:s==='@/components/AppIcon'?icon:s==='@/lib/lab-support'?labels:s.startsWith('@/')?new URL('../'+s.slice(2),import.meta.url).href:import.meta.resolve(s);code=code.replace(m[0],'from '+JSON.stringify(target));}
const {default:Inbox}=await import(uri(code));
test('support filters bound invalid input and page links preserve encoded search and ownership',()=>{
 const filters=supportFilters({filter:'unsupported',source:'other',ownership:'invalid',page:'999999999',q:'x'.repeat(200)});
 assert.equal(filters.filter,'attention');assert.equal(filters.source,'all');assert.equal(filters.page,100000);assert.equal(filters.q.length,150);
 const href=new URL(supportHref(supportFilters({filter:'done',source:'public',q:'a&b',ownership:'unassigned'}),{page:2}),'https://example.invalid');
 assert.equal(href.searchParams.get('q'),'a&b');assert.equal(href.searchParams.get('page'),'2');assert.equal(href.searchParams.get('ownership'),'unassigned');
});
test('support view uses server totals and navigation while rendering only supplied page summaries',()=>{
 const rows=[{id:'11111111-1111-4111-8111-111111111111',source:'member',subject:'Member enquiry',category:'other',status:'new',created_at:'2026-11-23',reporter_name:'Test member'},{id:'22222222-2222-4222-8222-222222222222',source:'public',subject:'Website enquiry',category:'general',status:'new',created_at:'2026-11-23'}];
 const html=renderToStaticMarkup(createElement(Inbox,{filters:supportFilters({filter:'all',q:'enquiry'}),data:{rows,total:70,page:2,page_size:25,topics:['general','other'],summary:{attention:60,waiting:0,done:10}}}));
 assert.match(html,/70 enquiries · 25 per page/);assert.match(html,/Page 2 of 3/);assert.match(html,/page=3/);assert.match(html,/page=1/);assert.equal((html.match(/class="lxEnquiryRow"/g)||[]).length,2);
 assert.match(html,/\/admin\/support\/public\/22222222/);assert.match(html,/action="\/admin\/support"/);assert.match(html,/Apply filters/);
});

