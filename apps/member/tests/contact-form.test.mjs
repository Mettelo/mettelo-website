import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import {validateContact} from '../lib/contact-contract.mjs';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const hooksUrl=uri(`let cells=[],index=0;export function useState(initial){const i=index++;if(!(i in cells))cells[i]=initial;return[cells[i],value=>cells[i]=value]}export function useRef(initial){const i=index++;return cells[i]??={current:initial}}export function begin(){index=0}export function reset(){cells=[];index=0}`);
const hooks=await import(hooksUrl);
let code=ts.transpileModule(await fs.readFile(new URL('../components/ContactForm.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const s=m[2],target=s==='react'?hooksUrl:s==='@/lib/site-origins.mjs'?uri('export const publicWebsiteOrigin=()=>"https://example.invalid"'):s.startsWith('@/')?new URL('../'+s.slice(2),import.meta.url).href:import.meta.resolve(s);code=code.replace(m[0],'from '+JSON.stringify(target));}
const {default:Form}=await import(uri(code));
const render=()=>{hooks.begin();return Form();};
function find(tree,predicate){if(!tree||typeof tree!=='object')return null;if(predicate(tree))return tree;for(const child of [tree.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;}
const fields={name:'Synthetic test organisation',email:'test@example.invalid',category:'partnership',organisation:'Example organisation',organisation_role:'Partner lead',organisation_url:'https://example.invalid',subject:'Synthetic partnership test',message:'A sufficiently detailed synthetic partnership proposal.',consent:'on',website:''};
test('partnership topic exposes required organisation inputs; submission keeps raw organisation fields for one server normalisation',async()=>{
 hooks.reset();let tree=render();find(tree,x=>x.type==='select').props.onChange({target:{value:'partnership'}});tree=render();
 assert.equal(find(tree,x=>x.type==='input'&&x.props.name==='organisation').props.required,true);
 const savedFetch=globalThis.fetch,OriginalFormData=globalThis.FormData;let transmitted,normalised,reset=false;
 globalThis.FormData=class extends OriginalFormData{constructor(form){super();for(const [k,v] of Object.entries(form.fields))this.set(k,v);}};
 globalThis.fetch=async(_url,options)=>{transmitted=JSON.parse(options.body);normalised=validateContact(transmitted);return new Response(JSON.stringify({reference:'WEB-TESTCASE'}),{status:200});};
 try{await find(tree,x=>x.type==='form').props.onSubmit({preventDefault(){},currentTarget:{fields,reset(){reset=true;}}});}finally{globalThis.fetch=savedFetch;globalThis.FormData=OriginalFormData;}
 assert.equal(transmitted.organisation,fields.organisation);assert.equal(transmitted.message,fields.message);assert.equal((normalised.message.match(/Organisation:/g)||[]).length,1);assert.equal(reset,true);assert.match(renderToStaticMarkup(render()),/WEB-TESTCASE/);
});
test('failed contact submission preserves entries and reuses the nonce for a safe retry',async()=>{
 hooks.reset();const tree=render(),savedFetch=globalThis.fetch,OriginalFormData=globalThis.FormData,calls=[];let reset=false;
 globalThis.FormData=class extends OriginalFormData{constructor(form){super();for(const [k,v] of Object.entries(form.fields))this.set(k,v);}};
 globalThis.fetch=async(_url,options)=>{calls.push(JSON.parse(options.body));return new Response(JSON.stringify({error:'Temporarily unavailable'}),{status:503});};
 const event={preventDefault(){},currentTarget:{fields,reset(){reset=true;}}};
 try{await find(tree,x=>x.type==='form').props.onSubmit(event);await find(render(),x=>x.type==='form').props.onSubmit(event);}finally{globalThis.fetch=savedFetch;globalThis.FormData=OriginalFormData;}
 assert.equal(reset,false);assert.equal(calls.length,2);assert.equal(calls[0].nonce,calls[1].nonce);assert.match(renderToStaticMarkup(render()),/Your entries are still here/);
});

