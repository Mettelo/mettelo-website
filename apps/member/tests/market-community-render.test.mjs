import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const cache=new Map(),data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const lab=data(`export async function labSession(){return {user:{id:'member'},db:{from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:{skills:'SQL, Python'}}}}}}}}export async function labRpc(){return {used:3,allowance:3,available:0,active:2,reserved:0,paused:1,revoking:0}}`);
const market=data(`export async function marketRpc(db,action){const f=globalThis.socialFixture;if(f.fail===action)throw Error('unavailable');return action==='my_labs'?f.labs||[]:f[action]||{rows:[]}}`);
const social=data(`export async function communityRpc(db,action){const f=globalThis.socialFixture;if(f.fail===action)throw Error('unavailable');return f[action]||{rows:[]}}`);
const proposals=data(`export async function proposalRpc(db,action){const f=globalThis.socialFixture;if(f.fail===action)throw Error('unavailable');return f[action]||{rows:[]}}`);
const discovery=data(`export async function discoveryRpc(db,action){const f=globalThis.socialFixture;if(f.fail===action)throw Error('unavailable');return f[action]}`);
const nextLink=data(`import {createElement} from 'react';export default function Link({href,children,onClick,...props}){return createElement('a',{...props,href,onClick},children)}` .replace("from 'react'",'from '+JSON.stringify(import.meta.resolve('react'))));
const navigation=data(`export function useRouter(){return {refresh(){},push(){}}}export function redirect(url){throw Error('REDIRECT:'+url)}`);
async function local(url){
 if(cache.has(url.href))return cache.get(url.href);
 let code=ts.transpileModule(await fs.readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText.replace(/import\s+['"][^'"]+\.css['"];?/g,'');
 for(const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){
  const s=m[2];let target;
  if(s.endsWith('.module.css'))target=data('export default new Proxy({},{get:(_,key)=>key})');else if(s==='@/lib/lab')target=lab;else if(s==='@/lib/lab-market')target=market;else if(s==='@/lib/market-community')target=social;else if(s==='@/lib/market-proposals')target=proposals;else if(s==='@/lib/market-discovery')target=discovery;else if(s==='next/navigation')target=navigation;else if(s==='next/link')target=nextLink;
  else if(s.startsWith('@/')||s.startsWith('.')){const base=s.startsWith('@/')?new URL('../'+s.slice(2),import.meta.url):new URL(s,url);let found;if(s.endsWith('.mjs'))found=base;for(const ext of found?[]:['.tsx','.ts'])try{const candidate=new URL(base.href+ext);await fs.access(candidate);found=candidate;break;}catch{}if(!found)throw Error('Unresolved '+s);target=await local(found);}
  else target=import.meta.resolve(s);
  code=code.replace(m[0],`from ${JSON.stringify(target)}`);
 }
 const result=data(code);cache.set(url.href,result);return result;
}
const pages={};for(const name of ['community','messages','moderation','proposals'])pages[name]=(await import(await local(new URL('../app/member/market/'+name+'/page.tsx',import.meta.url)))).default;
for(const [name,path] of [['home','MarketHome.tsx'],['profile','people/[id]/page.tsx'],['project','projects/[id]/page.tsx']])pages[name]=(await import(await local(new URL('../app/member/market/'+path,import.meta.url)))).default;
pages.history=(await import(await local(new URL('../components/ProfileHistorySection.tsx',import.meta.url)))).default;
pages.connections=(await import(await local(new URL('../components/MarketConnections.tsx',import.meta.url)))).default;
pages.homePreview=(await import(await local(new URL('../app/member/HomeCommunity.tsx',import.meta.url)))).default;
pages.sharing=(await import(await local(new URL('../components/MarketProfilePreferences.tsx',import.meta.url)))).default;
async function render(page,fixture={},query={}){globalThis.socialFixture=fixture;return renderToStaticMarkup(await pages[page]({query,params:Promise.resolve({id:'example-id'}),searchParams:Promise.resolve(query)}));}
const post={id:'post',author_id:'other',author:'Example member',kind:'question',body:'<script>alert(1)</script> A public question',topics:['SQL'],created_at:'2026-11-06T08:00:00Z',likes:1,comments:2};
test('community opens the post feed with safe text, inline discussion controls and reversible interactions',async()=>{
 const html=await render('community',{feed:{rows:[post]}});
 assert.match(html,/Start a post/);assert.match(html,/name="client_nonce"/);assert.match(html,/value="collaboration"/);assert.match(html,/Looking to collaborate/);assert.match(html,/Recruit for an active Lab/);assert.match(html,/name="action" value="publish"/);assert.match(html,/value="question"/);assert.match(html,/>Save<\/button>/);assert.match(html,/\+ Follow/);assert.match(html,/>Comment<\/button>/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>alert|value="collaborators"/);
});
test('discussion detail offers one level of replies and reporting with no private data fields',async()=>{
 const comment={id:'comment',author_id:'other',author:'Other',parent_id:null,body:'Helpful reference',created_at:post.created_at};
 const html=await render('community',{post:{post,comments:[comment,{...comment,id:'reply',parent_id:'comment'}]}},{post:'post'});
 assert.equal((html.match(/Reply to this comment/g)||[]).length,1);assert.match(html,/name="parent_id" value="comment"/);assert.match(html,/Only the reported excerpt/);assert.doesNotMatch(html,/private_notes|private_lab_document|recipient_email/);
});
test('message requests require recipient action before showing the message composer',async()=>{
 const conversation={id:'thread',member_id:'other',name:'Other',state:'requested',requested_by:'other'};
 const received=await render('messages',{conversation:{conversation,messages:[]}},{conversation:'thread'});
 assert.match(received,/Accept message request/);assert.doesNotMatch(received,/Send message<\/button>/);
 const sent=await render('messages',{conversation:{conversation:{...conversation,requested_by:'member'},messages:[]}},{conversation:'thread'});
 assert.match(sent,/Further messages become available/);assert.doesNotMatch(sent,/Accept message request/);
 const accepted=await render('messages',{conversation:{conversation:{...conversation,state:'accepted'},messages:[{id:'message',sender_id:'other',body:'Newest private message',created_at:post.created_at},{id:'older',sender_id:'member',body:'Earlier private message',created_at:'2026-11-05T08:00:00Z'}]}},{conversation:'thread'});
 assert.ok(accepted.indexOf('Earlier private message')<accepted.indexOf('Newest private message'),'Message DOM order follows the conversation chronologically');assert.match(accepted,/Send message<\/button>/);assert.match(accepted,/Block this member/);assert.match(accepted,/name="target_id" value="message"/);
});
test('message list shows unread counts and an explicit initial request form',async()=>{
 const html=await render('messages',{conversations:{rows:[{id:'thread',name:'Other',state:'requested',requested_by:'other',unread:1}]}},{member:'other'});
 assert.match(html,/1 unread/);assert.match(html,/New message request/);assert.match(html,/name="action" value="message_request"/);assert.match(html,/Lab participation limits do not restrict messaging/);
});
test('moderation renders only reported excerpts and uses reasoned outcomes; failures never imply an empty queue',async()=>{
 const html=await render('moderation',{reports:{rows:[{id:'report',kind:'message',reason:'Review this content',snapshot:{body:'Reported excerpt'},created_at:post.created_at}]}});
 assert.match(html,/Reported excerpt/);assert.match(html,/name="reason"/);assert.doesNotMatch(html,/Remove reported content|Open conversation/);
 assert.match(await render('moderation',{fail:'reports'}),/authorised operations administrator/);
 assert.doesNotMatch(await render('messages',{fail:'conversations'}),/No conversations yet/);
});
test('proposal drafts separate saving from submission and only administrators receive review controls',async()=>{
 const proposal={id:'proposal',owner_id:'member',title:'Member idea',skills:['SQL'],state:'draft',version:2,description:'Public description',participation:'flexible'};
 const draft=await render('proposals',{detail:{proposal,can_review:false}},{proposal:'proposal'});
 assert.match(draft,/Save draft/);assert.match(draft,/Submit saved proposal for review/);assert.match(draft,/name="version" value="2"/);assert.doesNotMatch(draft,/Record a review decision/);
 const review=await render('proposals',{detail:{proposal:{...proposal,state:'submitted'},can_review:true}},{proposal:'proposal',view:'queue'});
 assert.match(review,/Record a review decision/);assert.match(review,/name="roles"/);assert.match(review,/name="reason"/);assert.match(review,/Approval opens official applications/);
});
test('approved project details lead to the ordinary application route without claiming a Lab is active',async()=>{
 const proposal={id:'proposal',title:'Approved member idea',skills:['SQL'],state:'approved',project_ref:'MTL-MP-ABCDEF123456',description:'Approved project summary'};
 const html=await render('proposals',{detail:{proposal,can_review:false}},{proposal:'proposal'});
 assert.match(html,/\/member\/projects\/MTL-MP-ABCDEF123456\/interest/);assert.match(html,/approval has not created an active Lab/);assert.doesNotMatch(html,/Enter Lab|Save draft|Record a review decision/);
});
test('unified feed mixes public opportunities and posts with one Messages link and Saved as a filter',async()=>{
 const opportunity={...post,id:'project-card',entry_type:'project',source_id:'lab',title:'Example Lab',roles:['Analyst'],commitment:'Two hours weekly',available:1};
 const html=await render('home',{feed:{rows:[post,opportunity]}});
 assert.match(html,/marketReadingColumn/);assert.match(html,/3 of 3 Lab slots used/);assert.match(html,/Example Lab/);assert.match(html,/Explore collaboration/);assert.match(html,/category=projects/);assert.match(html,/category=ideas/);assert.match(html,/category=seeking/);assert.match(html,/Your activity/);assert.equal((html.match(/href="\/member\/market\/messages"/g)||[]).length,1);assert.doesNotMatch(html,/Your Market|feedToolLinks|Manage your visibility/);
 assert.match(await render('home',{fail:'feed'}),/Posts could not load/);
});
test('public member profiles omit absent private fields and offer invitations only through the current leader roles',async()=>{
 const profile={id:'other',full_name:'Other',headline:'Analyst',skills:['SQL'],contactable:true,following:false};
 const html=await render('profile',{profile});assert.match(html,/Message request/);assert.doesNotMatch(html,/Location|Invite to a project/);
 const leader=await render('profile',{profile,labs:[{team_id:'lab',title:'Example Lab',roles:['Analyst']}]});assert.match(leader,/Invite to a project/);assert.match(leader,/name="lab_role"/);
 assert.match(await render('profile',{fail:'profile'}),/Member profile unavailable/);
});
test('public project details show approved recruitment and explicit highlights while preserving external access wording',async()=>{
 const project={team_id:'lab',project_ref:'MTL-TEST',title:'Example Lab',origin:'Mettelo project',available:1,description:'Public summary',skills:['SQL'],roles:['Analyst'],commitment:'Two hours weekly',following:false,leader:{id:'leader',name:'Leader',contactable:true},highlights:[]};
 const html=await render('project',{project});assert.match(html,/Request to collaborate/);assert.match(html,/Message leader/);assert.match(html,/Follow public project updates/);assert.match(html,/Private Lab activity is not shown/);assert.match(html,/external repository provisioning/);
 assert.doesNotMatch(await render('project',{project:{...project,available:0}}),/Send collaboration request/);
});

test('saved posts scopes the search and removes publishing controls while retaining feed navigation',async()=>{
 const html=await render('home',{feed:{rows:[]}},{view:'bookmarks',q:'SQL'});
 assert.match(html,/<h1>Lab Market<\/h1>/);assert.match(html,/Your saved community posts/);assert.match(html,/name="view" value="bookmarks"/);assert.match(html,/Clear search/);assert.doesNotMatch(html,/name="action" value="publish"|Labs seeking collaborators/);
});

test('profile sharing preferences preserve saved choices and fail closed without rendering a reset form',async()=>{
 const html=await render('sharing',{preferences:{discoverable:true,contactable:false,share_details:true,share_location:false,notify_community:false,notify_messages:true}});
 assert.match(html,/name="return_to" value="profile"/);assert.match(html,/name="discoverable"[^>]*checked/);assert.match(html,/name="share_details"[^>]*checked/);assert.doesNotMatch(html,/name="contactable"[^>]*checked|name="share_location"[^>]*checked|name="notify_community"[^>]*checked/);
 const failed=await render('sharing',{fail:'preferences'});assert.match(failed,/saved choices are unchanged/);assert.doesNotMatch(failed,/<form/);
});

 test('Home community preview is bounded, safely escaped and hidden when empty or unavailable',async()=>{
 const html=await render('homePreview',{feed:{rows:[post,{...post,id:'second',kind:'idea'}, {...post,id:'third',body:'Hidden third item'}]}});
 assert.match(html,/Latest from the community/);assert.match(html,/View community/);assert.match(html,/community\?post=post/);assert.match(html,/&lt;script&gt;/);assert.match(html,/>Idea</);assert.doesNotMatch(html,/Hidden third item|Publish post|Like<|Comment</);
 assert.equal(await render('homePreview',{feed:{rows:[]}}),'');assert.equal(await render('homePreview',{fail:'feed'}),'');
 });
 test('posting opens a dedicated labelled editor with optional details and guarded publish',async()=>{
 const html=await render('home',{feed:{rows:[post]}});
 assert.match(html,/<dialog[^>]*aria-labelledby="market-post-title"/);assert.match(html,/<details class="marketPostExtras">/);assert.match(html,/Keep draft &amp; close/);assert.match(html,/disabled="">Publish post/);assert.match(html,/Drafts are kept on this page/);
 });

test('people suggestions provide follow controls and photos with an accessible compact mobile panel',async()=>{
 const person={id:'00000000-0000-4000-8000-000000000001',full_name:'Shared member',headline:'Analyst'};
 const html=await render('home',{suggestions:{rows:[person]}});
 assert.match(html,/People to follow/);assert.match(html,/marketPeopleMobile/);assert.match(html,/Follow Shared member/);assert.match(html,/\/api\/market-avatar\?member_id=/);assert.match(html,/loading="lazy"/);
});
test('profile connections show bounded shared follower and following lists with follow actions',async()=>{
 globalThis.socialFixture={connections:{followers:26,following:1,rows:[{id:'00000000-0000-4000-8000-000000000001',full_name:'Visible follower',headline:'Shared role',following:true}]}};
 const html=renderToStaticMarkup(await pages.connections({db:{},memberId:'profile',userId:'member'}));
 assert.match(html,/26 followers/);assert.match(html,/Following \(1\)/);assert.match(html,/Visible follower/);assert.match(html,/Unfollow Visible follower/);assert.match(html,/Next 25/);assert.match(html,/Hidden profiles and blocked members/);
});

test('education and experience render as separate repeatable records with safe text and private editors',()=>{
 const id='00000000-0000-4000-8000-000000000001',profile={profile_version:1,education_entries:[{id,qualification:'BSc',institution:'First institution',period:'2018–2022',description:'<script>unsafe</script>'},{id:'00000000-0000-4000-8000-000000000002',qualification:'MSc',institution:'Second institution'}],experience_entries:[{id,title:'Analyst',organisation:'Example organisation',period:'2024–present'}]};
 const education=renderToStaticMarkup(createElement(pages.history,{profile,kind:'education_entries'}));assert.match(education,/First institution/);assert.match(education,/Second institution/);assert.match(education,/&lt;script&gt;/);assert.match(education,/Add another education/);assert.match(education,/Remove this entry/);assert.match(education,/Save education/);
 const experience=renderToStaticMarkup(createElement(pages.history,{profile,kind:'experience_entries'}));assert.match(experience,/Analyst/);assert.match(experience,/Example organisation/);assert.match(experience,/Responsibilities and achievements/);assert.doesNotMatch(experience,/First institution/);
});
