import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../waitlist/form.js'),'utf8');
const settle=()=>new Promise(r=>setImmediate(r));
async function run({available=true,ok=true,network=false,valid=true}={}){
 const fields={disabled:true}, status={textContent:'Unavailable'}, button={disabled:false,textContent:'Join the platform waitlist'};
 let submit, reset=0, posts=0;
 const form={querySelector:s=>s==='fieldset'?fields:button,reportValidity:()=>valid,addEventListener:(event,fn)=>submit=fn,reset:()=>reset++};
 const context={document:{querySelector:s=>s==='#waitlist-form'?form:status},FormData:class{get(key){return {name:'Test Member',email:'test@example.test',consent:'yes',website:''}[key]}},fetch:async(url,options)=>{
  if(options.method!=='POST')return {ok:true,json:async()=>({available})};
  posts++;assert.equal(url,'/waitlist/index.php');assert.equal(JSON.parse(options.body).consent,true);
  if(network)throw new TypeError('offline');
  return {ok,json:async()=>({message:ok?'Request sent':'Service unavailable'})};
 },Error,TypeError};
 vm.runInNewContext(source,context);await settle();await submit({preventDefault(){}});
 return {fields,status,button,posts,reset};
}
let result=await run();assert.equal(result.posts,1);assert.equal(result.reset,1);assert.equal(result.status.textContent,'Request sent');assert.equal(result.button.disabled,false);
result=await run({available:false});assert.equal(result.posts,0);assert.equal(result.fields.disabled,true);
result=await run({valid:false});assert.equal(result.posts,0);
result=await run({ok:false});assert.equal(result.reset,0);assert.equal(result.status.textContent,'Service unavailable');assert.equal(result.button.disabled,false);
result=await run({network:true});assert.equal(result.reset,0);assert(result.status.textContent.includes('may have reached us'));
console.log('Waitlist browser logic: availability, invalid input, queued success, server error and interrupted connection passed.');
