import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const source=await fs.readFile(new URL('../app/admin/projects/ProjectOperations.tsx',import.meta.url),'utf8');
const router='data:text/javascript;base64,'+Buffer.from('export function useRouter(){return {refresh(){},replace(){}}}').toString('base64');
let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
for(const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const s=match[2],url=s==='next/navigation'?router:s.startsWith('@/')?new URL('../'+s.slice(2),import.meta.url).href:import.meta.resolve(s);code=code.replace(match[0],`from ${JSON.stringify(url)}`);}
const {default:Operations}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const applicant={id:'app',user_id:'person',project_ref:'TEST',name:'Candidate',participation:'flexible',role:'Analyst',review_status:'shortlisted',answers:{commitment_response:'yes',coordination_preference:'comfortable'},motivation:'Example motivation',contribution:'Example contribution',submitted_at:'2026-11-01T00:00:00Z'};
const initial={workflow_version:2,responsibilities_version:1,projects:[{ref:'TEST',title:'Example project',roles:['Analyst','Engineer'],member_capacity:4}],interests:[applicant],teams:[]};
const render=(mode,changes={})=>renderToStaticMarkup(createElement(Operations,{initial,mode,formationProject:'TEST',returnTo:'/admin/projects?section=teams',referenceSeed:'FIXTURE',...changes}));
test('application detail preserves the review decision and private note form',()=>{
 const html=render('application');assert.match(html,/Save review/);assert.match(html,/name="review_status"/);assert.match(html,/name="reason"/);assert.match(html,/Example motivation/);
});
test('Solo and Team formation retain applicant selection and required responsibility controls',()=>{
 for(const arrangement of ['solo','team']){const html=render('formation',{arrangement,candidateTotal:1});assert.match(html,/Shortlisted applicants/);assert.match(html,/Essential responsibilities/);assert.match(html,/Candidate/);assert.match(html,/Search candidates/);assert.match(html,arrangement==='solo'?/Offer Solo placement/:/Form team &amp; offer places/);}
});
test('on-demand team detail preserves access verification, member release and paused Lab resumption',()=>{
 const team={id:'team',project_ref:'TEST',label:'Example team',participation:'team',status:'paused',lab_enabled:true,coordinator_id:'person',maximum_members:4,required_roles:['Analyst'],readiness:{ready:true,checks:[]},members:[{user_id:'person',name:'Candidate',role:'Analyst',status:'confirmed',admitted:true,access_verified:false,commitment_confirmed:true}]};
 const html=render('team',{initial:{...initial,teams:[team]}});assert.match(html,/Record access check/);assert.match(html,/Release member/);assert.match(html,/Resume Lab/);assert.match(html,/name="reason"/);
});
