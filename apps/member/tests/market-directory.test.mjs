import test from 'node:test';
import assert from 'node:assert/strict';
import {directoryDetailHref,directoryReturnHref} from '../lib/market-directory.mjs';
test('directory detail and return links preserve search, area and page without accepting redirect targets',()=>{
 const detail=new URL(directoryDetailHref('people','member-id',{q:'SQL & data',area:'Analytics',page:'4'}),'https://example.test');
 const back=new URL(directoryReturnHref('people',Object.fromEntries(detail.searchParams)),'https://example.test');
 assert.equal(back.pathname,'/member/market');assert.equal(back.searchParams.get('q'),'SQL & data');assert.equal(back.searchParams.get('area'),'Analytics');assert.equal(back.searchParams.get('page'),'4');
 assert.equal(directoryReturnHref('projects',{return_to:'https://evil.test',directory_page:'-2'}),'/member/market?tab=projects');
});
test('project navigation bounds context, omits people filters and escapes record identifiers',()=>{
 const url=new URL(directoryDetailHref('projects','../x?tab=manage',{q:'x'.repeat(200),area:'private',page:'999999'}),'https://example.test');
 assert.match(url.pathname,/%2Fx%3Ftab%3Dmanage/);assert.equal(url.searchParams.get('directory_q').length,150);assert.equal(url.searchParams.get('directory_page'),'100000');assert.equal(url.searchParams.has('directory_area'),false);
 assert.equal(directoryReturnHref('projects',{directory_page:'nonsense',directory_area:'Analytics'}),'/member/market?tab=projects');
});
