import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {validateCatalogue} from '../scripts/validate-project-catalogue.mjs';
import filtering from '../projects/catalogue.js';
const data=JSON.parse(readFileSync(new URL('../content/project-catalogue.json',import.meta.url),'utf8'));
test('all 50 source briefs retain IDs, full metadata and safe master repositories',()=>{
  assert.equal(validateCatalogue(data).ok,true);
  const index=readFileSync(new URL('../projects/index.html',import.meta.url),'utf8');
  assert.equal((index.match(/data-project /g)||[]).length,50);
  for(const project of data){
    const file=new URL(`../projects/${project.id.toLowerCase()}/index.html`,import.meta.url);
    assert(existsSync(file));const html=readFileSync(file,'utf8');
    assert(html.includes(project.repository));assert(html.includes('data-member-route="/member/projects/'+project.id+'/interest"'));assert(html.includes('/projects/data-use/'));
    assert(html.includes(`https://mettelo.com/projects/${project.id.toLowerCase()}/`));
    assert.equal((html.match(/<h1>/g)||[]).length,1);
    assert(!html.includes('undefined'));assert(!html.includes('null</'));
  }
});
test('catalogue search combines case-insensitive words and exact facets without duplicates',()=>{
  const project={search:'mtl-da-001 retail banking sql python',track:'Data Analytics',sector:'Banking',roles:['Data Analyst','BI Developer']};
  assert(filtering.matchesProject(project,{q:'BANKING sql',track:'Data Analytics',roles:'Data Analyst'}));
  assert(!filtering.matchesProject(project,{q:'banking missing'}));
  assert(!filtering.matchesProject(project,{sector:'Healthcare'}));
  assert(!filtering.matchesProject(project,{roles:'Data Scientist'}));
  assert(filtering.matchesProject(project,{}));
});

test('member app uses the identical public project catalogue',()=>{
 assert.deepEqual(JSON.parse(readFileSync(new URL('../apps/member/lib/project-catalogue.snapshot.json',import.meta.url),'utf8')),data);
});

test('pilot activity ranking puts 20 contributors ahead of 15, with stable team and reference ties',()=>{const row=(reference,people,teams,forming=0)=>({reference,title:reference,recorded:true,active_contributors:people,active_teams:teams,forming_teams:forming});const rows=[row('C',10,1),row('B',15,2),row('A',20,3),row('D',15,3),{reference:'E',title:'E',recorded:false}];assert.deepEqual([...rows].sort((a,b)=>filtering.compareProjectActivity(a,b,'active')).map(p=>p.reference),['A','D','B','C','E']);assert.deepEqual([row('Z',0,0,2),row('A',20,3,1)].sort((a,b)=>filtering.compareProjectActivity(a,b,'forming')).map(p=>p.reference),['Z','A']);assert.equal(filtering.compareProjectActivity(row('A',15,2),row('B',15,2),'active')<0,true);});
test('pagination covers every matching project once and clamps stale or invalid pages',()=>{
 const items=Array.from({length:50},(_,id)=>id);
 const pages=Array.from({length:7},(_,i)=>filtering.paginateProjects(items,i+1));
 assert.deepEqual(pages.flatMap(result=>result.items),items);
 assert.equal(pages[6].items.length,2);
 assert.equal(filtering.paginateProjects(items,999).page,7);
 assert.equal(filtering.paginateProjects(items,'invalid').page,1);
 assert.equal(filtering.paginateProjects(items,-2).page,1);
 assert.deepEqual(filtering.paginateProjects([],7).items,[]);
 assert.equal(filtering.paginateProjects(items.slice(0,3),7).page,1);
});
