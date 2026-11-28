import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {uiIconModule} from './helpers/ui-icon-module.mjs';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
// Exercise real click handlers without DOM, network, publishing, or a signed-in account.
const hooksUrl=uri(`let cells=[],cursor=0;export function useRef(initial){const i=cursor++;cells[i]??={current:initial};return cells[i]}export function useState(initial){const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return[cells[i],value=>{cells[i]=typeof value==='function'?value(cells[i]):value}]}export function begin(){cursor=0}export function reset(){cells=[];cursor=0}`);
const hooks=await import(hooksUrl);
const jsx=import.meta.resolve('react/jsx-runtime');
const link=uri(`export default function Link(){return null}`);
async function load(file){let code=ts.transpileModule(await fs.readFile(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText.replace(/import\s+['"][^'"]+\.css['"];?/g,'');for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const name=m[2],url=name==='react'?hooksUrl:name==='react/jsx-runtime'?jsx:name==='next/link'?link:name==='@/components/AppIcon'?uiIconModule:name==='@/lib/portfolio-share-presentation.mjs'?new URL('../lib/portfolio-share-presentation.mjs',import.meta.url).href:name==='@/lib/member-portfolio.mjs'?new URL('../lib/member-portfolio.mjs',import.meta.url).href:name==='./PortfolioProofCard'?await load('../components/PortfolioProofCard.tsx'):import.meta.resolve(name);code=code.replace(m[0],'from '+JSON.stringify(url));}return uri(code);}
const {default:Share}=await import(await load('../components/PortfolioShare.tsx'));
const record={id:'source',kind:'contribution',title:'A practical contribution',body:'Built a reproducible reporting pipeline with documented quality checks.',skills:['SQL'],url:'https://private.example.test/evidence',review_state:'member-reported',recorded_at:'2026-11-12T12:00:00Z'};
const text=e=>e==null?'':typeof e==='string'?e:typeof e==='number'?String(e):Array.isArray(e)?e.map(text).join(''):text(e.props?.children);
function button(tree,label){const found=[];function walk(e){if(!e||typeof e!=='object')return;if(Array.isArray(e)){e.forEach(walk);return;}if(e.type==='button'&&text(e)===label)found.push(e);walk(e.props?.children);}walk(tree);assert.equal(found.length,1,label);return found[0];}
function render(preview=false){hooks.begin();return Share({record,authorName:'Alex Taylor',preview});}
const flush=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
test('Connect is preview-first, then one confirmation creates and posts once despite rapid clicks',async()=>{
 hooks.reset();const old=globalThis.fetch,calls=[];globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push(body);return Response.json(body.action==='create'?{id:'share',token:'public-token'}:{post_id:'post'});};
 try{let tree=render();button(tree,'Connect').props.onClick();assert.equal(calls.length,0,'Opening the preview never publishes');tree=render();const publish=button(tree,'Publish summary to Connect');publish.props.onClick();publish.props.onClick();await flush();assert.deepEqual(calls.map(c=>c.action),['create','feed']);assert.equal(calls[0].approved_public,true);assert.equal(calls[0].include_evidence,false);assert.equal(calls[0].evidence_url,null);assert.equal(calls[1].id,'share');assert.match(text(render()),/Posted to Mettelo Connect/);}finally{globalThis.fetch=old;}
});
test('a Connect failure retains the created link and retry posts without creating another link',async()=>{
 hooks.reset();const old=globalThis.fetch,calls=[];let feedAttempts=0;globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push(body);if(body.action==='create')return Response.json({id:'share',token:'public-token'});feedAttempts++;return feedAttempts===1?Response.json({error:'Temporary feed failure'},{status:503}):Response.json({post_id:'post'});};
 try{let tree=render();button(tree,'Connect').props.onClick();button(render(),'Publish summary to Connect').props.onClick();await flush();assert.match(text(render()),/Temporary feed failure/);button(render(),'Post to Connect').props.onClick();await flush();assert.deepEqual(calls.map(c=>c.action),['create','feed','feed']);}finally{globalThis.fetch=old;}
});
test('fictional preview cannot publish even if its disabled handler is invoked',async()=>{
 hooks.reset();const old=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch')};try{button(render(true),'Connect').props.onClick();const publish=button(render(true),'Publish summary to Connect');assert.equal(publish.props.disabled,true);publish.props.onClick();await flush();assert.equal(calls,0);}finally{globalThis.fetch=old;}
});
