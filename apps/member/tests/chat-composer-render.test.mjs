import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Render the real component without effects, network requests or database writes.
const source=await fs.readFile(new URL('../components/lab/ProjectMessagePanel.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText
 .replaceAll('"react/jsx-runtime"',JSON.stringify(import.meta.resolve('react/jsx-runtime')))
 .replaceAll("'react'",JSON.stringify(import.meta.resolve('react')));
const {default:Panel}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const props={projectId:'TEST',projectRunId:'fixture',currentUserId:'member',team:[{id:'member',name:'Test member',role:'Analyst',headline:null}],initialMessages:[],canLead:true};

test('active assigned Solo and Team members receive a labelled textarea and send control',()=>{
 for(const solo of [true,false]){
  const html=renderToStaticMarkup(createElement(Panel,{...props,solo,readOnly:false}));
  assert.match(html,/<textarea/);assert.match(html,/messageComposer/);assert.match(html,/messageSend/);
  assert.match(html,/Project chat/);
  assert.doesNotMatch(html,/messageReadOnly/);
 }
});

test('preparation and other read-only views explain the state with a visible disabled message box',()=>{
 const html=renderToStaticMarkup(createElement(Panel,{...props,solo:true,readOnly:true,readOnlyMessage:'This Solo Lab is being prepared.'}));
 assert.match(html,/<textarea[^>]*disabled/);assert.match(html,/<button[^>]*disabled/);assert.doesNotMatch(html,/<form/);assert.match(html,/This Solo Lab is being prepared/);
});
