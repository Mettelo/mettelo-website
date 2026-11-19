import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import {resolveUiIcon} from './helpers/ui-icon-module.mjs';
const uri=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const compile=source=>ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
let code=resolveUiIcon(compile(readFileSync(new URL('../app/signin/AuthAccountClient.tsx',import.meta.url),'utf8')));
const identity=uri(compile(readFileSync(new URL('../lib/member-identity.ts',import.meta.url),'utf8')));
const auth=uri('export function createClient(){throw Error("Auth must not run during presentation checks")}');
for(const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){
 const spec=match[2],target=spec==='@/lib/supabase/client'?auth:spec==='@/lib/member-identity'?identity:spec==='@/lib/auth-navigation.mjs'?new URL('../lib/auth-navigation.mjs',import.meta.url).href:import.meta.resolve(spec);
 code=code.replace(match[0],'from '+JSON.stringify(target));
}
const {default:Account}=await import(uri(code));
test('account forms retain labelled required fields and readable action labels in each mode',()=>{
 for(const initialMode of ['signin','signup','reset']){
  const html=renderToStaticMarkup(createElement(Account,{memberCount:null,initialMode}));
  assert.equal((html.match(/<h1>/g)||[]).length,1);
  assert.match(html,/<label for="email">Email address \*<\/label>/);assert.match(html,/<input[^>]+id="email"[^>]+required=""/);
  if(initialMode!=='reset'){assert.match(html,/for="password"/);assert.match(html,/aria-label="Show password"/);}
  assert.doesNotMatch(html,/[→←↗]/);
 }
});
test('registration presents ordered setup steps with only the account stage current',()=>{
 const html=renderToStaticMarkup(createElement(Account,{memberCount:null,initialMode:'signup'}));
 assert.match(html,/<ol class="authProgress" aria-label="Account setup steps">/);
 assert.equal((html.match(/aria-current="step"/g)||[]).length,1);
 assert.match(html,/for="fullName"/);assert.match(html,/for="username"/);
 assert.match(html,/Verify email/);assert.match(html,/Create Mettelo account/);
});
