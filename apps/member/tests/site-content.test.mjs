import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import defaults from '../lib/site-content-defaults.json' with {type:'json'};
import {renderContentHtml} from '../lib/site-content-render.mjs';
import {validateContent,safeContentUrl} from '../lib/site-content-contract.mjs';
const root=new URL('../../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
test('homepage content and SEO render in HTML without executable editor text or lost layout classes',()=>{const data={...defaults.home,headline:'A <script>headline</script>\nWith people',seo_title:'A "new" title',faqs:[{question:'A question?',answer:'Answer <script>alert(1)</script>'}],ecosystem:defaults.home.ecosystem};const html=renderContentHtml(read('index.html'),{key:'page:home',data,brand:defaults.brand,preview:true});assert.match(html,/A &lt;script&gt;headline/);assert.match(html,/<title>A &quot;new&quot; title<\/title>/);assert.match(html,/class="home-v3"/);assert.match(html,/name="robots" content="noindex,nofollow"/);assert.doesNotMatch(html,/<script>alert\(1\)/);assert.equal((html.match(/name="homepage-faq"/g)||[]).length,1);assert.equal((html.match(/class="ecosystem-tile/g)||[]).length,7)});
test('project edits update the rendered summary, challenge and master link while retaining provenance links',()=>{const html=renderContentHtml(read('projects/mtl-da-001/index.html'),{key:'project:MTL-DA-001',data:{title:'Updated title',description:'An updated summary',problem:'A different problem',repository:'https://github.com/example/new-repository',skills:'SQL, Python',roles:['Data Analyst']}});assert.match(html,/class="catalogue-lead">An updated summary/);assert.match(html,/A different problem/);assert.match(html,/href="https:\/\/github.com\/example\/new-repository"/);assert.match(html,/MTL-DA-001-retail-banking-intelligence\/blob\/main\/data\/README.md/);assert.match(html,/Data Analyst/)});
test('content validation rejects scripts in URL fields and accidental role/configuration fields',()=>{for(const bad of ['javascript:alert(1)','https://name:secret@example.com/image.png','//untrusted.example/image.png'])assert.equal(safeContentUrl(bad,true),false);assert.throws(()=>validateContent('page:home',{...defaults.home,primary_href:'https://elsewhere.test'}));assert.throws(()=>validateContent('page:home',{...defaults.home,capacity:99}));assert.doesNotThrow(()=>validateContent('page:home',defaults.home))});
test('archived briefs leave catalogue cards and structured discovery while other projects remain',()=>{
 const source=read('projects/index.html'),projects=[{key:'project:MTL-DA-001',data:{archived:true}}];
 const html=renderContentHtml(source,{projects});
 assert.doesNotMatch(html,/<article\b[^>]*data-reference="MTL-DA-001"/);
 assert.match(html,/<article\b[^>]*data-reference="MTL-DA-002"/);
 const schema='<script type="application/ld+json">'+JSON.stringify({'@type':'ItemList',numberOfItems:2,itemListElement:[{item:'https://mettelo.com/projects/mtl-da-001/'},{item:{url:'https://mettelo.com/projects/mtl-da-002/'}}]})+'</script>';
 const result=renderContentHtml(schema,{projects});
 assert.doesNotMatch(result,/mtl-da-001/);assert.match(result,/mtl-da-002/);assert.match(result,/"numberOfItems":1/);
});
test('closed briefs remain readable but no longer offer an application button',()=>{
 const html=renderContentHtml(read('projects/mtl-da-001/index.html'),{key:'project:MTL-DA-001',data:{intake_open:false}});
 assert.match(html,/Applications are closed for this project/);
 assert.doesNotMatch(html,/<a\b[^>]*href="[^"]*\/member\/projects\/[^\"]+\/interest/);
 assert.match(html,/Retail Banking/);
});
import catalogue from '../lib/project-catalogue.snapshot.json' with {type:'json'};
test('unchanged project seed preserves the homepage showcase copy; explicit title edits update the matching card',()=>{const source=read('index.html'),p=catalogue.find(p=>p.id==='MTL-DA-001'),data={title:p.name,description:p.brief,problem:p.problem,category:p.track,skills:p.capabilities.join(', ')};const card=html=>html.match(/<article\b[^>]*data-reference="MTL-DA-001"[^>]*>[\s\S]*?<\/article>/)[0];assert.equal(card(renderContentHtml(source,{projects:[{key:'project:'+p.id,data}]})),card(source));const changed=card(renderContentHtml(source,{projects:[{key:'project:'+p.id,data:{...data,title:'A published revised project name'}}]}));assert.match(changed,/A published revised project name/);assert.ok(changed.includes('Explore customer behaviour'))});
