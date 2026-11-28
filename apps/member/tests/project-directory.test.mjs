import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDirectoryFilters,projectDirectoryHref} from '../lib/project-directory.mjs';
test('directory defaults to attention and bounds unsupported filters and oversized input',()=>{
 assert.equal(projectDirectoryFilters().section,'attention');
 const f=projectDirectoryFilters({section:'unknown',status:'deleted',page:'-9',q:'x'.repeat(300)});
 assert.equal(f.page,1);assert.equal(f.status,'all');assert.equal(f.q.length,150);
});
test('opening and closing details preserves list filters and page without carrying a record selection',()=>{
 const filters=projectDirectoryFilters({section:'teams',project:'MTL-DA-001',q:'Sarah & team',status:'active',page:'3'});
 const open=new URL(projectDirectoryHref(filters,{team:'fixture'}),'https://example.invalid');
 assert.equal(open.searchParams.get('page'),'3');assert.equal(open.searchParams.get('q'),'Sarah & team');assert.equal(open.searchParams.get('team'),'fixture');
 assert.equal(new URL(projectDirectoryHref(filters),'https://example.invalid').searchParams.has('team'),false);
});
test('candidate selection cannot redirect the admin outside the project directory',()=>{
 assert.ok(projectDirectoryHref(projectDirectoryFilters(),{redirect:'https://example.invalid',page:2}).startsWith('/admin/projects?'));
 assert.doesNotMatch(projectDirectoryHref(projectDirectoryFilters(),{redirect:'https://example.invalid'}),/redirect/);
});
