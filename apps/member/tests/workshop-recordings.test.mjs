import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecordings,combineRecordings,WORKSHOP_PLAYLISTS,CHANNEL_ID,latestRecordings} from '../lib/workshop-recordings.mjs';
const entry=(id,date,title='A workshop',channel=CHANNEL_ID)=>'<entry><yt:videoId>'+id+'</yt:videoId><yt:channelId>'+channel+'</yt:channelId><title>'+title+'</title><published>'+date+'</published></entry>';
test('recordings select the two newest published channel videos and decode titles',()=>{
 const xml='<feed>'+entry('aaaaaaaaaaa','2026-01-01')+entry('bbbbbbbbbbb','2026-02-01','Data &amp; AI')+entry('ccccccccccc','2026-03-01')+'</feed>';
 const result=parseRecordings(xml,Date.parse('2026-04-01'));assert.deepEqual(result.map(v=>v.id),['ccccccccccc','bbbbbbbbbbb']);assert.equal(result[1].title,'Data & AI');
});
test('invalid IDs, foreign channels, future dates and duplicates do not become recordings',()=>{
 const xml='<feed>'+entry('bad','2026-01-01')+entry('aaaaaaaaaaa','2026-01-01','Other','other')+entry('bbbbbbbbbbb','2030-01-01')+entry('ccccccccccc','2026-03-01')+entry('ccccccccccc','2026-03-01')+'</feed>';
 assert.equal(parseRecordings(xml,Date.parse('2026-04-01')).length,1);assert.deepEqual(parseRecordings('<feed/>'),[]);assert.throws(()=>parseRecordings('<!DOCTYPE feed><feed/>'));assert.throws(()=>parseRecordings('invalid'));
});
test('playlist results merge by publication date and remove overlapping videos',()=>{
 const video=(id,published)=>({id,published,title:id});
 const result=combineRecordings([[video('a','2026-01-01'),video('b','2026-02-01')],[video('b','2026-02-01'),video('c','2026-03-01')]]);
 assert.deepEqual(result.map(v=>v.id),['c','b']);
});
test('a feed outage retains the last successful recordings',async()=>{
 const original=globalThis.fetch;let calls=0;const originalNow=Date.now;let now=Date.parse('2026-04-01');Date.now=()=>now;
 globalThis.fetch=async(url)=>{assert(WORKSHOP_PLAYLISTS.some(id=>url.endsWith('playlist_id='+id)));calls++;if(calls>5)throw Error('offline');return {ok:true,text:async()=>'<feed>'+entry('aaaaaaaaaaa','2026-01-01')+entry('bbbbbbbbbbb','2026-02-01')+'</feed>'};};
 try{const first=await latestRecordings();assert.equal(first.length,2);assert.deepEqual(await latestRecordings(),first);assert.equal(calls,5);now+=900001;assert.deepEqual(await latestRecordings(),first);assert.equal(calls,10);assert.deepEqual(await latestRecordings(),first);assert.equal(calls,10);}finally{globalThis.fetch=original;Date.now=originalNow;}
});
