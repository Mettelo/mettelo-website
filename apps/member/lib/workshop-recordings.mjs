import {XMLParser} from 'fast-xml-parser';
export const CHANNEL_ID='UCrxDi-Zsbmm4ECrDZP7y1yQ';
export const WORKSHOP_PLAYLISTS=['PLWLTzaIhYph8','PLVyJ84XZhrBQ','PLKkjuiMd8lVw','PLPHLFThLRBdc','PLMrB4zLYtFRg'];
export const FALLBACK_IDS=['3aGN8qjMQm8','O6eZUWORtn8'];
export function parseRecordings(xml,now=Date.now()){
 if(typeof xml!=='string'||xml.length>1000000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Invalid feed');
 const feed=new XMLParser({ignoreAttributes:false,processEntities:true}).parse(xml)?.feed;
 if(feed===undefined||feed===null)throw Error('Missing feed');
 const entries=Array.isArray(feed.entry)?feed.entry:feed.entry?[feed.entry]:[];
 const seen=new Set();
 return entries.filter(e=>{const id=e['yt:videoId'],date=Date.parse(e.published);if(!/^[\w-]{11}$/.test(id)||e['yt:channelId']!==CHANNEL_ID||typeof e.title!=='string'||!e.title.trim()||!Number.isFinite(date)||date>now||seen.has(id))return false;seen.add(id);return true;}).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published)).slice(0,2).map(e=>({id:e['yt:videoId'],title:e.title.trim().slice(0,240),published:new Date(e.published).toISOString()}));
}
export function combineRecordings(feeds){
 const seen=new Set();
 return feeds.flat().sort((a,b)=>Date.parse(b.published)-Date.parse(a.published)||a.id.localeCompare(b.id)).filter(video=>{if(seen.has(video.id))return false;seen.add(video.id);return true;}).slice(0,2);
}
let cache=null,pending=null,retryAfter=0;
export async function latestRecordings(){
 if(cache&&Date.now()-cache.checked<900000)return cache.items;
 if(Date.now()<retryAfter)return cache?.items||[];
 if(pending)return pending;
 pending=(async()=>{try{
  const configured=process.env.METTELO_YOUTUBE_WORKSHOP_PLAYLISTS||process.env.METTELO_YOUTUBE_WORKSHOP_PLAYLIST||'';
  const playlists=configured?configured.split(',').map(id=>id.trim()):WORKSHOP_PLAYLISTS;
  if(!playlists.length||playlists.length>10||playlists.some(id=>!/^[\w-]{10,80}$/.test(id)))throw Error('Invalid playlists');
  const feeds=await Promise.all([...new Set(playlists)].map(async playlist=>{
   const response=await fetch('https://www.youtube.com/feeds/videos.xml?playlist_id='+playlist,{signal:AbortSignal.timeout(8000),redirect:'error',cache:'no-store'});
   if(!response.ok)throw Error('Feed unavailable');
   return parseRecordings(await response.text());
  }));
  const items=combineRecordings(feeds);if(items.length<2)throw Error('Incomplete feeds');
  cache={items,checked:Date.now()};return items;
 }catch{retryAfter=Date.now()+60000;return cache?.items||[];}finally{pending=null;}})();return pending;
}

