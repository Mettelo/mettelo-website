import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Render the real components; only the Next router is inert. No effects or requests run.
const cache=new Map();
const routerStub='data:text/javascript;base64,'+Buffer.from('export function useRouter(){return {refresh(){}}}').toString('base64');
async function componentUrl(url){
 if(cache.has(url.href))return cache.get(url.href);
 let code=ts.transpileModule(await fs.readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){
  const specifier=match[2];
  const local=specifier.startsWith('@/')?new URL('../'+specifier.slice(2)+'.tsx',import.meta.url):specifier.startsWith('.')?new URL(specifier+(specifier.endsWith('.mjs')?'':'.tsx'),url):null;
  const resolved=specifier==='next/navigation'?routerStub:local?await componentUrl(local):import.meta.resolve(specifier);
  code=code.replace(match[0],`from ${JSON.stringify(resolved)}`);
 }
 const result='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(url.href,result);return result;
}
async function load(name){return(await import(await componentUrl(new URL(`../components/lab/${name}.tsx`,import.meta.url)))).default;}
const Meetings=await load('LabMeetings'),Evidence=await load('LabEvidence');
const common={teamId:'fixture',members:[{id:'owner',name:'Test owner',role:'Analyst'}],currentUserId:'owner'};
const render=(Component,props)=>renderToStaticMarkup(createElement(Component,props));

test('active member meeting UI exposes scheduling and the complete enabled booking form',()=>{
 const html=render(Meetings,{teamId:'fixture',meetings:[],canSchedule:true});
 assert.match(html,/Schedule meeting/);
 for(const name of ['topic','local_start','duration','time_zone','join_url','agenda'])assert.ok(html.includes(`name="${name}"`),name);
 assert.doesNotMatch(html,/<fieldset disabled/);
});
test('preparation meeting UI keeps the booking action discoverable and explains why saving is unavailable',()=>{
 const html=render(Meetings,{teamId:'fixture',meetings:[],canSchedule:false,readOnlyReason:'Repository access still needs verification.'});
 assert.match(html,/Schedule meeting/);assert.match(html,/Repository access still needs verification/);assert.match(html,/<fieldset disabled/);
});
test('active Solo and Team contribution UIs include the entry action and enabled evidence form',()=>{
 for(const solo of [true,false]){
  const html=render(Evidence,{...common,entries:[],writable:true,solo});
  assert.match(html,/Add my contribution/);
  for(const name of ['title','url','body','collaboration'])assert.ok(html.includes(`name="${name}"`),name);
  assert.doesNotMatch(html,/<fieldset disabled/);
  assert.match(html,solo?/How did you approach the work/:/How did you work together/);
 }
});
test('read-only contribution UI shows the action, explanation and protected form',()=>{
 const html=render(Evidence,{...common,entries:[],writable:false,solo:true,readOnlyReason:'This Lab is paused.'});
 assert.match(html,/Add my contribution/);assert.match(html,/This Lab is paused/);assert.match(html,/<fieldset disabled/);
});
