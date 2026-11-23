'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import './market-people.css';
export default function MarketFollowButton({memberId,name,following=false}:{memberId:string;name:string;following?:boolean}){
 const router=useRouter(),[active,setActive]=useState(following),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>setActive(following),[memberId,following]);
 async function toggle(){if(busy)return;setBusy(true);setError('');try{const response=await fetch('/api/market-community',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action:'follow',member_id:memberId,enabled:String(!active)})});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not update following.');setActive(!active);router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <span className="marketFollowControl"><button type="button" disabled={busy} aria-pressed={active} aria-label={(active?'Unfollow ':'Follow ')+name} onClick={()=>void toggle()}>{busy?'Saving…':active?'Following':'+ Follow'}</button>{error&&<small role="alert">{error}</small>}</span>;
}
