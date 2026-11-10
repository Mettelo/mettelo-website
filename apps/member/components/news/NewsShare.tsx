'use client';
import {useState} from 'react';
import {articleShares,articleUrl} from '@/lib/news.mjs';
export default function NewsShare({slug,title}:{slug:string;title:string}){
 const [message,setMessage]=useState('');const url=articleUrl(slug);
 return <section className="newsShare" aria-label="Share this article"><h2>Worth sharing?</h2><p>Pass this article on to your network.</p><div>{articleShares(slug,title).map(item=><a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${item.label} (opens a new tab)`}>{item.label} ↗</a>)}<button onClick={async()=>{try{await navigator.clipboard.writeText(url);setMessage('Article link copied.');}catch{setMessage('Copy the article link below.');}}}>Copy link</button><button onClick={async()=>{if(!navigator.share){setMessage('Choose a network or copy the article link.');return;}try{await navigator.share({title,url});}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))setMessage('Sharing could not be opened. Choose a network or copy the link.');}}}>More ways to share</button></div><p role="status" aria-live="polite">{message}</p>{message==='Copy the article link below.'&&<label>Article link<input readOnly value={url} onFocus={event=>event.target.select()}/></label>}</section>;
}
