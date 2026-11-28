import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const navigation=data('export function useRouter(){return {refresh(){}}}');
const source=await fs.readFile(new URL('../app/admin/projects/AdminCollaborationCapacity.tsx',import.meta.url),'utf8');
let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)])code=code.replace(m[0],'from '+JSON.stringify(m[2]==='next/navigation'?navigation:import.meta.resolve(m[2])));
const {default:Capacity}=await import(data(code));
test('administrator collaborator capacity stays in the team panel and respects occupied places',()=>{
 const html=renderToStaticMarkup(createElement(Capacity,{teamId:'lab',capacity:3,occupied:2}));
 assert.match(html,/min="2"/);assert.match(html,/max="12"/);assert.match(html,/value="3"/);assert.match(html,/Save collaborator capacity/);
 assert.doesNotMatch(html,/href=.*member\/market|action="\/api\/lab-market"/);
});
test('unknown admin capacity does not render a guessed editable value',()=>{
 const html=renderToStaticMarkup(createElement(Capacity,{teamId:'lab',capacity:null,occupied:null}));
 assert.match(html,/Capacity could not be confirmed/);assert.doesNotMatch(html,/<form|Save collaborator capacity/);
});

