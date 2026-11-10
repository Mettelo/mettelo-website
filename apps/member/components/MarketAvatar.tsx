'use client';
import {useState} from 'react';
import './market-people.css';
export default function MarketAvatar({memberId,name,className='',priority=false}:{memberId:string;name:string;className?:string;priority?:boolean}){
 const [failed,setFailed]=useState(false);
 const valid=/^[0-9a-f-]{36}$/i.test(memberId);
 return <span className={'marketAvatar '+className} aria-hidden="true"><span>{name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()||'M'}</span>{valid&&!failed&&<img src={'/api/market-avatar?member_id='+encodeURIComponent(memberId)} alt="" width={40} height={40} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} onError={()=>setFailed(true)}/>}</span>;
}
