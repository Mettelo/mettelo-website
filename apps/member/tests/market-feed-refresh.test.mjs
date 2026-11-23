import test from 'node:test';
import assert from 'node:assert/strict';
import {feedSnapshotSeed,refreshFeedPage} from '../lib/market-feed.mjs';
const rows=Array.from({length:30},(_,i)=>({id:String(99-i).padStart(3,'0'),created_at:new Date(Date.UTC(2026,10,23,12,0,59-i)).toISOString(),following:false,bookmarked:false}));
test('returning after a new post preserves the displaced boundary row and previously loaded older posts',()=>{
 const newest={...rows[0],id:'100',created_at:'2026-11-23T13:00:00.000Z'};
 const result=refreshFeedPage(rows,[newest,...rows].slice(0,25));
 assert.deepEqual(result.map(x=>x.id),[newest,...rows].map(x=>x.id));
 assert.equal(new Set(result.map(x=>x.id)).size,31);
});
test('fresh server data replaces follow/save state and removes deleted rows inside the refreshed page',()=>{
 const expected=rows.filter(x=>x.id!==rows[3].id).map(x=>x.id===rows[1].id?{...x,following:true,bookmarked:true}:x);
 const result=refreshFeedPage(rows,expected.slice(0,25));
 assert.deepEqual(result,expected);
});
test('a complete short server page discards stale cached rows instead of showing inaccessible old results',()=>{
 const fresh=[{...rows[2],following:true}];
 assert.deepEqual(refreshFeedPage(rows,fresh),fresh);
 assert.deepEqual(refreshFeedPage(rows,[]),[]);
});
test('changed follow or save state invalidates the old snapshot even when post identities are unchanged',()=>{
 const old=feedSnapshotSeed(rows.slice(0,25));
 assert.notEqual(feedSnapshotSeed(rows.slice(0,25).map((r,i)=>i===0?{...r,following:true}:r)),old);
 assert.notEqual(feedSnapshotSeed(rows.slice(0,25).map((r,i)=>i===0?{...r,bookmarked:true}:r)),old);
 assert.equal(feedSnapshotSeed(structuredClone(rows.slice(0,25))),old);
});
