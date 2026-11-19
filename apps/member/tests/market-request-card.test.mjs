import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const link=uri(`import React from ${JSON.stringify(import.meta.resolve('react'))};export default function Link({children,...props}){return React.createElement('a',props,children)}`);
const messaging=uri(`import React from ${JSON.stringify(import.meta.resolve('react'))};export function MarketMessageButton({memberId,label}){return React.createElement('button',{'data-message-member':memberId,type:'button'},label)}`);
async function load(file){let code=ts.transpileModule(await fs.readFile(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;for(const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const name=match[2],url=name==='@/components/MarketMessaging'?messaging:name==='next/link'?link:name==='./MarketActionForm'?await action:import.meta.resolve(name);code=code.replace(match[0],'from '+JSON.stringify(url));}return uri(code)}
const action=load('../app/member/market/MarketActionForm.tsx');
const {default:Card}=await import(await load('../app/member/market/CollaborationRequestCard.tsx'));
const base={id:'request',team_id:'team',member_id:'applicant',initiated_by:'applicant',kind:'request',state:'pending',role:'Analyst',proposal:'I can contribute SQL analysis.',commitment:'Weekly',expires_at:'2026-11-26T12:00:00Z',title:'A project',member_name:'Alex',profile_member_id:'applicant',profile_name:'Alex',can_manage:true};
const render=changes=>renderToStaticMarkup(React.createElement(Card,{record:{...base,...changes},userId:'leader',page:3}));
test('eligible applicant has profile review before an enabled acceptance with the correct request ID',()=>{const html=render();assert.match(html,/people\/applicant\?from=requests&amp;request_page=3/);assert.ok(html.indexOf('View profile')<html.indexOf('Accept collaborator'));assert.match(html,/name="request_id" value="request"/);assert.doesNotMatch(html,/disabled/)});
test('a project placement conflict disables acceptance but keeps profile review and decline available',()=>{const html=render({admission_blocker:'Already has a place in this project.'});assert.match(html,/disabled=""[^>]*>Accept collaborator/);assert.match(html,/Already has a place/);assert.match(html,/>Decline<\/button>/);assert.match(html,/>View profile<\/a>/)});
test('non-managers cannot decide requests; invitation profiles target the inviter rather than the invitee',()=>{assert.doesNotMatch(render({can_manage:false}),/Accept collaborator|>Decline</);assert.match(render({kind:'invitation',profile_member_id:'inviter'}),/people\/inviter\?from=requests/)});

test('request messaging targets the reviewed member and never offers messaging oneself',()=>{assert.match(render(),/data-message-member="applicant"[^>]*>Message/);assert.doesNotMatch(render({profile_member_id:'leader'}),/data-message-member/);assert.match(render({kind:'invitation',profile_member_id:'inviter'}),/data-message-member="inviter"/)});
