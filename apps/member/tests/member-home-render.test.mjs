import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {uiIconModule} from './helpers/ui-icon-module.mjs';
import {memberHome} from '../lib/member-home.mjs';
import {memberProgress} from '../lib/member-progress.mjs';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const css=uri('export default new Proxy({},{get:(_,key)=>String(key)})');
const catalogue=JSON.parse(await fs.readFile(new URL('../lib/project-catalogue.snapshot.json',import.meta.url),'utf8'));
const projects=uri('const catalogue='+JSON.stringify(catalogue)+';export function websiteProject(id){return catalogue.find(p=>p.id.toLowerCase()===id.toLowerCase())||null;}');
let avatarSource=await fs.readFile(new URL('../components/MarketAvatar.tsx',import.meta.url),'utf8');
avatarSource=avatarSource.replace(/import '[^']+\.css';/g,'');
let avatarCode=ts.transpileModule(avatarSource,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
for(const m of [...avatarCode.matchAll(/from\s+(['"])([^'"]+)\1/g)])avatarCode=avatarCode.replace(m[0],'from '+JSON.stringify(import.meta.resolve(m[2])));
const avatar=uri(avatarCode);
async function component(file){
 let code=ts.transpileModule(await fs.readFile(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const name=match[2],url=name==='@/components/AppIcon'?uiIconModule:name==='@/components/MarketAvatar'?avatar:name.endsWith('.css')?css:name==='@/lib/project-catalogue'?projects:name==='@/lib/market-community'?uri('export async function communityRpc(){throw Error("Test uses the pure community view")}'):name.startsWith('@/')?new URL('../'+name.slice(2),import.meta.url).href:import.meta.resolve(name);code=code.replace(match[0],'from '+JSON.stringify(url));}
 return import(uri(code));
}
const {default:Dashboard,HomeDashboardSkeleton}=await component('../app/member/HomeDashboard.tsx');
const {HomeCommunityView,HomeCommunityLoading}=await component('../app/member/HomeCommunity.tsx');
const active={team_id:'active',project_ref:'TEST',title:'An active project',role:'Analyst',label:'Team A',participation:'team',team_status:'active',membership_status:'confirmed',can_enter:true,lab_enabled:true,commitment_confirmed:true};
const defaults={cards:[],applications:[],applicationCount:0,applicationsFailed:false,labFailed:false,profilePercent:80};
const metrics=[{label:'Active projects',value:0},{label:'Milestones accepted',value:0},{label:'Projects delivered',value:0},{label:'Skills practised',value:0}];
const render=(changes={})=>{const input={...defaults,...changes};return renderToStaticMarkup(React.createElement(Dashboard,{...input,home:memberHome(input),metrics,progressUnavailable:false,firstName:'Alex',website:'https://example.test',...changes}));};

test('new and exploring states prioritise a specific action without zero achievement panels',()=>{
 const fresh=render({profilePercent:50});assert.match(fresh,/Complete your profile to apply/);assert.match(fresh,/href="\/member\/profile"/);assert.match(fresh,/80% is needed to apply/);assert.match(fresh,/photo is optional/);assert.match(fresh,/Meet people in Connect/);assert.doesNotMatch(fresh,/Recorded progress|0 submitted applications|Your project journeys/);
 const ready=render();assert.match(ready,/Find your next project/);assert.match(ready,/href="https:\/\/example.test\/projects\/"/);assert.doesNotMatch(ready,/Before your first Lab|Your saved profile|Recorded progress/);
});
test('active work links to the actual item and lists only accessible active Labs',()=>{
 const excluded=[{...active,team_id:'paused',team_status:'paused'},{...active,team_id:'hidden',can_enter:false},{...active,team_id:'completed',team_status:'completed'}];
 const item={id:'milestone-a',kind:'milestone',owner_id:'me',title:'Agree definitions',status:'todo',created_at:'2026-11-11T09:00:00Z'};
 const progress=memberProgress({cards:[active],userId:'me',workspaces:[{team_id:'active',items:[item]}]});
 const html=render({cards:[active,{...active,team_id:'other-active'},...excluded],progress});assert.match(html,/>Open milestone</);assert.match(html,/href="\/member\/lab\/active\?view=plan#milestone-milestone-a"/);assert.match(html,/href="\/member\/lab\/other-active"/);for(const id of ['active','paused','hidden','completed'])assert.doesNotMatch(html,new RegExp('href="/member/lab/'+id+'"'));
 assert.ok(html.indexOf('Other Labs')<html.indexOf('Explore next'));
});
test('incomplete active profiles remain secondary and never block current work',()=>{
 const html=render({cards:[active],profilePercent:40});assert.match(html,/>Enter Lab</);assert.match(html,/Your saved profile/);assert.doesNotMatch(html,/Complete your profile to apply|Choose where to start/);
});
test('the main Lab entry opens overview, with a separately named item shortcut',()=>{
 const item={id:'milestone-a',kind:'milestone',owner_id:'me',title:'Agree definitions',status:'todo',created_at:'2026-11-11T09:00:00Z'};
 const progress=memberProgress({cards:[active],userId:'me',workspaces:[{team_id:'active',items:[item]}]});
 const html=render({cards:[active],progress});assert.match(html,/class="primary" href="\/member\/lab\/active\?view=home">Enter Lab/);assert.match(html,/class="textAction" href="\/member\/lab\/active\?view=plan#milestone-milestone-a">Open milestone/);
});
test('application primary chooses a submission without a confirmed placement, not an unrelated latest record',()=>{
 const html=render({cards:[{...active,team_status:'completed'}],applications:[{project_ref:'TEST',submitted_at:'2026-11-11'},{project_ref:'OTHER',submitted_at:'2026-11-10'}],applicationCount:2});
 assert.match(html,/Your application is submitted/);assert.match(html,/href="\/member\/projects\/OTHER\/interest"/);assert.doesNotMatch(html,/Under review|Queue position|Enter Lab/);
});
test('completed contributors can review Portfolio and retain an authorised read-only Lab route',()=>{
 const html=render({cards:[{...active,team_status:'completed'}]});assert.match(html,/Review the work you/);assert.match(html,/class="primary" href="\/member\/portfolio"/);assert.match(html,/Completed · read-only/);assert.match(html,/href="\/member\/lab\/active"/);assert.doesNotMatch(html,/>Enter Lab</);
});
test('offers retain priority, and preparing/paused/expired places never offer entry',()=>{
 const offer={...active,team_id:'offer',membership_status:'offered',offer_expires_at:'2099-01-01T00:00:00Z'};
 assert.match(render({cards:[active,offer]}),/>Review your offer</);
 for(const card of [{...active,team_status:'forming',can_enter:false},{...active,team_status:'paused',can_enter:false},{...offer,offer_expires_at:'2020-01-01T00:00:00Z'}])assert.doesNotMatch(render({cards:[card]}),/>Enter Lab</);
});
test('progress suppresses known zeros while failed sources remain explicitly unavailable',()=>{
 const html=render({cards:[active],metrics:[{label:'Active projects',value:1},{label:'Milestones accepted',value:0},{label:'Skills practised',value:null}],progressUnavailable:true});
 assert.match(html,/Recorded progress/);assert.match(html,/Active projects/);assert.doesNotMatch(html,/<h3>Milestones accepted|<h3>Skills practised/);assert.match(html,/Some progress could not load/);
 const failed=render({labFailed:true,applicationsFailed:true,metrics:metrics.map(m=>({...m,value:null})),progressUnavailable:true});assert.match(failed,/Project information could not load/);assert.match(failed,/Applications could not load/);assert.doesNotMatch(failed,/Find your next project|No active Labs|0 submitted/);
});
test('development examples disable dashboard destinations and retain only return-to-real-home link',()=>{
 const html=render({cards:[active],example:true});assert.match(html,/Example state · actions disabled/);assert.equal((html.match(/<a /g)||[]).length,1);assert.match(html,/href="\/member"/);assert.match(html,/<button[^>]*disabled/);
});
test('community preview is bounded, escapes content and keeps project/post destinations distinct',()=>{
 const post={id:'post-a',author_id:'00000000-0000-4000-8000-000000000001',author:'A member',kind:'question',body:'<script>unsafe</script>',created_at:'invalid'};
 const html=renderToStaticMarkup(React.createElement(HomeCommunityView,{posts:[post,{...post,id:'project-b',entry_type:'project',source_id:'team-b',title:'Project opportunity'},{...post,id:'omitted'}]}));
 assert.match(html,/From Mettelo Connect/);assert.match(html,/&lt;script&gt;/);assert.match(html,/community\?post=post-a/);assert.match(html,/\/market\/projects\/team-b/);assert.doesNotMatch(html,/omitted|Invalid Date|<time/);
 assert.match(html,/\/api\/market-avatar\?member_id=00000000-0000-4000-8000-000000000001/);assert.match(html,/loading="lazy"/);
});
test('dashboard/community loading, empty and failure states are distinct and do not invent counters',()=>{
 const loading=renderToStaticMarkup(React.createElement(HomeDashboardSkeleton));assert.match(loading,/aria-busy="true"/);assert.doesNotMatch(loading,/Active projects|No recent posts/);
 assert.match(renderToStaticMarkup(React.createElement(HomeCommunityLoading)),/Loading recent posts/);
 assert.match(renderToStaticMarkup(React.createElement(HomeCommunityView)),/No recent posts yet/);
 const failed=renderToStaticMarkup(React.createElement(HomeCommunityView,{failed:true}));assert.match(failed,/Community updates are unavailable/);assert.doesNotMatch(failed,/No recent posts/);
});

test('dashboard destinations appear once across new, exploring, active, completed and failure states',()=>{
 const completed={...active,team_status:'completed'};
 const scenarios=[{profilePercent:50},{},{cards:[active]},{cards:[active],metrics:[{label:'Active projects',value:1}]},{cards:[completed],metrics:[{label:'Projects delivered',value:1}]},{cards:[{...active,team_status:'forming',can_enter:false}]},{applicationsFailed:true,labFailed:true,progressUnavailable:true},{applications:[{project_ref:'OTHER'}],applicationCount:1}];
 for(const scenario of scenarios){const html=render(scenario),hrefs=[...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(hrefs).size,hrefs.length,JSON.stringify(scenario));}
 assert.doesNotMatch(render({cards:[active]}),/id="home-labs-title"/);
 assert.doesNotMatch(render(),/>Browse briefs</);
 const community=renderToStaticMarkup(React.createElement(HomeCommunityView,{showAction:false}));assert.doesNotMatch(community,/>Open Connect</);
});
