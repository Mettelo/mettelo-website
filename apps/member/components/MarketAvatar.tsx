'use client';
import {useEffect,useRef,useState} from 'react';
import './market-people.css';
export default function MarketAvatar({memberId,name,className='',priority=false}:{memberId:string;name:string;className?:string;priority?:boolean}){
 const image=useRef<HTMLImageElement>(null);
 const [failed,setFailed]=useState<string|null>(null),[loaded,setLoaded]=useState<string|null>(null);
 const valid=/^[0-9a-f-]{36}$/i.test(memberId);
 const src='/api/market-avatar?member_id='+encodeURIComponent(memberId);
 // An image can finish before hydration attaches its load/error listeners.
 useEffect(()=>{if(image.current?.complete){if(image.current.naturalWidth>0)setLoaded(src);else setFailed(src);}},[src]);
 return <span className={'marketAvatar '+className} aria-hidden="true"><span>{name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()||'M'}</span>{valid&&failed!==src&&<img ref={image} src={src} alt="" width={40} height={40} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} data-ready={loaded===src} onLoad={()=>setLoaded(src)} onError={()=>setFailed(src)}/>}</span>;
}
