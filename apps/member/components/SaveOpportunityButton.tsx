'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

// Adapted from the platform control; the website does not enable deadline emails.
export default function SaveOpportunityButton({opportunityId,initialSaved,signedOut=false,compact=false}:{opportunityId:string;initialSaved?:boolean;signedOut?:boolean;compact?:boolean}){
 const router=useRouter();
 const [saved,setSaved]=useState(initialSaved??false);
 const [state,setState]=useState<'loading'|'ready'|'anonymous'|'error'>(signedOut?'anonymous':initialSaved===undefined?'loading':'ready');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  if(signedOut){setState('anonymous');return;}
  if(initialSaved!==undefined){setSaved(initialSaved);setState('ready');return;}
  const controller=new AbortController();setState('loading');
  fetch(`/api/opportunities/saved?opportunity_id=${encodeURIComponent(opportunityId)}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{
   if(response.status===401){if(!controller.signal.aborted)setState('anonymous');return;}
   if(!response.ok)throw new Error();const body=await response.json();
   if(!controller.signal.aborted){setSaved(Boolean(body.saved));setState('ready');}
  }).catch(()=>{if(!controller.signal.aborted)setState('error');});
  return()=>controller.abort();
 },[opportunityId,initialSaved,signedOut,retry]);
 async function toggle(){
  if(busy||state!=='ready')return;setBusy(true);setMessage('');
  try{const response=await fetch('/api/opportunities/saved',{method:saved?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({opportunity_id:opportunityId})});
   if(response.status===401){setState('anonymous');return;}const body=await response.json();
   if(!response.ok){setMessage(body.error||'Unable to update saved opportunity.');return;}
   setSaved(Boolean(body.saved));setMessage(body.message);router.refresh();
  }catch{setMessage('Unable to update saved opportunity. Please try again.');}finally{setBusy(false);}
 }
 if(state==='anonymous')return <Link className="button ghost" href="/signin?next=%2Fmember%2Fsaved-opportunities">Sign in to save</Link>;
 return <div className={compact?'saveOpportunity compact':'saveOpportunity'}>{state==='error'?<><p role="status">Saved status unavailable.</p><button className="button ghost" onClick={()=>setRetry(value=>value+1)}>Check again</button></>:<button className="button ghost" type="button" disabled={busy||state==='loading'} aria-pressed={saved} onClick={toggle}>{state==='loading'?'Checking…':busy?'Updating…':saved?'Remove saved role':'Save role'}</button>}{message&&<p role="status">{message}{saved&&<> <Link href="/member/saved-opportunities">View saved roles →</Link></>}</p>}</div>;
}
