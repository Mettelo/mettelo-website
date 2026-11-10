import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Render the real page/components against an inert session, not a live database.
const cache=new Map();
const moduleUrl=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const session=moduleUrl(`export async function labSession(){return {user:{id:'member'},db:{from(){return {select(){return {eq(column,id){if(column!=='user_id'||id!=='member')throw Error('Missing ownership filter');return {order:async()=>globalThis.journeyFixture.applications}}}}}}}}}export async function labRpc(db,action){if(action==='participation_usage'){if(globalThis.journeyFixture.usageError)throw Error('unavailable');return globalThis.journeyFixture.usage||{used:1,allowance:2,available:1,active:1,reserved:0,paused:0,revoking:0};}if(globalThis.journeyFixture.labError)throw Error('unavailable');return globalThis.journeyFixture.cards}`);
const statuses=moduleUrl(`export async function applicationStatuses(){if(globalThis.journeyFixture.statusError)throw Error('unavailable');return new Map(globalThis.journeyFixture.statuses||[])}`);
const navigation=moduleUrl(`export function redirect(url){throw Error('REDIRECT:'+url)}export function usePathname(){return '/member/lab'}`);
async function localUrl(url){
 if(cache.has(url.href))return cache.get(url.href);
 if(url.pathname.endsWith('.json')){const result=moduleUrl('export default '+await fs.readFile(url,'utf8'));cache.set(url.href,result);return result;}
 let code=ts.transpileModule(await fs.readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replace(/import\s+['"][^'"]+\.css['"];?/g,'');
 for(const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){
  const s=match[2];let target;
  if(s==='@/lib/lab')target=session;
  else if(s==='@/lib/application-status-server')target=statuses;
  else if(s==='next/navigation')target=navigation;
  else if(s.startsWith('@/')||s.startsWith('.')){
   const base=s.startsWith('@/')?new URL('../'+s.slice(2),import.meta.url):new URL(s,url);
   if(/\.(mjs|json)$/.test(base.pathname))target=base.pathname.endsWith('.mjs')?base.href:await localUrl(base);
   else {let found;for(const ext of ['.tsx','.ts']){const candidate=new URL(base.href+ext);try{await fs.access(candidate);found=candidate;break;}catch{}}if(!found)throw Error('Missing '+base);target=await localUrl(found);}
  }else target=import.meta.resolve(s);
  code=code.replace(match[0],`from ${JSON.stringify(target)}`);
 }
 const result=moduleUrl(code);cache.set(url.href,result);return result;
}
const {default:Page}=await import(await localUrl(new URL('../app/member/lab/page.tsx',import.meta.url)));
const {projectJourneys}=await import(await localUrl(new URL('../lib/project-journeys.ts',import.meta.url)));
const {default:Placement}=await import(await localUrl(new URL('../components/lab/LabPlacementCard.tsx',import.meta.url)));
const application={id:'app',project_ref:'MTL-AI-010',participation:'solo',primary_role:'AI Engineer',submitted_at:'2026-11-05T10:00:00Z',review_status:'shortlisted'};
const card={team_id:'team',project_ref:'MTL-AI-010',title:'Knowledge Assistant',label:'Team example',team_status:'forming',participation:'solo',role:'AI Engineer',membership_status:'offered',lab_enabled:true,minimum:1,confirmed:0,access_verified:false,two_person_proposed:false,two_person_agreed:false,can_enter:false};
const html=node=>renderToStaticMarkup(node);
async function page(fixture={}){globalThis.journeyFixture={applications:{data:[application],error:null},statuses:[['app','shortlisted']],cards:[],...fixture};return html(await Page({searchParams:Promise.resolve({})}));}

test('one project groups its application and placements without dropping other placements',()=>{
 const groups=projectJourneys([application],[{...card,team_id:'old',team_status:'completed',membership_status:'confirmed',can_enter:true},card]);
 assert.equal(groups.length,1);assert.equal(groups[0].application.id,'app');assert.deepEqual(groups[0].placements.map(c=>c.team_id),['team','old']);
});
test('an application appears in Lab before an offer exists, without implying admission',async()=>{
 const result=await page();assert.match(result,/1 project<\/h2>/);assert.match(result,/Shortlisted/);assert.match(result,/not an offer or a confirmed place/);assert.match(result,/aria-current="step"/);assert.doesNotMatch(result,/Enter Lab|name="response"/);
});
test('an offered placement replaces the duplicate application card and keeps its receipt',async()=>{
 const result=await page({cards:[card]});assert.equal((result.match(/class="pcCard"/g)||[]).length,1);assert.match(result,/Application details/);assert.match(result,/View submitted answers/);assert.match(result,/name="commitment_confirmed"/);assert.match(result,/<button(?=[^>]*name="response")(?=[^>]*value="accept")[^>]*>/);assert.match(result,/<button(?=[^>]*name="response")(?=[^>]*value="decline")[^>]*>/);assert.doesNotMatch(result,/Enter Lab/);
});
test('accepted preparation retains real blockers and never offers a second acceptance',async()=>{
 const result=await page({cards:[{...card,membership_status:'confirmed',commitment_confirmed:true,readiness:{ready:false,checks:[{label:'Repository access checked',ready:false}]}}]});
 assert.match(result,/verify repository access/);assert.match(result,/No second acceptance/);assert.doesNotMatch(result,/name="response"|Enter Lab/);
});
test('workspace links still require explicit admitted active/completed access',()=>{
 for(const team_status of ['forming','paused','active','completed'])for(const can_enter of [false,true]){
  const result=html(createElement(Placement,{card:{...card,membership_status:'confirmed',team_status,can_enter}}));
  assert.equal(result.includes('href="/member/lab/team"'),can_enter&&['active','completed'].includes(team_status));
 }
});
test('declined and withdrawn applications stay visible as closed rather than ready',async()=>{
 for(const status of ['declined','withdrawn']){const result=await page({statuses:[['app',status]]});assert.match(result,/Application journey closed/);assert.doesNotMatch(result,/Enter Lab/);}
});
test('failed placement reads show partial data without claiming no offer exists',async()=>{
 const result=await page({labError:true});assert.match(result,/Placement status unavailable/);assert.match(result,/cannot confirm your current offer or Lab status/);assert.doesNotMatch(result,/class="pcJourney"|Find a project that fits/);
});
test('failed application reads do not hide valid placement controls',async()=>{
 const result=await page({applications:{data:null,error:{message:'unavailable'}},cards:[card]});assert.match(result,/Application records could not load/);assert.match(result,/Review offer/);
});
test('status lookup failure never falls back to received or shortlisted',async()=>{
 const result=await page({statusError:true});assert.match(result,/Status unavailable/);assert.doesNotMatch(result,/Your application has been shortlisted|awaiting review/);
});
test('a real empty journey invites an application; a total outage does not',async()=>{
 assert.match(await page({applications:{data:[],error:null}}),/Your project journey starts with an application/);
 const result=await page({applications:{data:null,error:{}},labError:true});assert.doesNotMatch(result,/Your project journey starts with an application/);assert.match(result,/Reload your projects/);
});
test('legacy applications URL preserves bookmarks and the safe development preview',async()=>{
 const {default:Legacy}=await import(await localUrl(new URL('../app/member/applications/page.tsx',import.meta.url)));
 await assert.rejects(Legacy({searchParams:Promise.resolve({})}),/REDIRECT:\/member\/lab$/);
});
test('Lab usage displays the configured allowance without hiding discovery at the limit',async()=>{
 const result=await page({usage:{used:3,allowance:3,available:0,active:1,reserved:1,paused:1,revoking:0}});
 assert.match(result,/3 of 3 Lab slots used/);assert.match(result,/1 active · 1 reserved · 1 paused/);assert.match(result,/can still browse projects/);assert.match(result,/Find a project/);
});
test('a failed usage request reports uncertainty without hiding existing projects',async()=>{
 const result=await page({usageError:true});assert.match(result,/Lab usage could not load/);assert.match(result,/Shortlisted/);assert.doesNotMatch(result,/0 of 3/);
});
