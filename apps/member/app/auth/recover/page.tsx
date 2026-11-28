'use client';
import {FormEvent,useEffect,useRef,useState} from 'react';
import AccountJourneyCard from '@/components/AccountJourneyCard';

export default function RecoverPage(){
 const [token,setToken]=useState(''),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const readLink=useRef(false);
 useEffect(()=>{
  if(readLink.current)return;readLink.current=true;
  // The email secret stays out of server/access logs and is removed from the
  // address bar before any navigation. Opening this page never consumes it.
  const hash=new URLSearchParams(window.location.hash.slice(1)),value=hash.get('token_hash')||'';
  window.history.replaceState(null,'',window.location.pathname);
  if(/^[A-Za-z0-9_-]{32,256}$/.test(value))setToken(value);
  else setError('This page needs the link from your latest password reset email. Open that email again, or request a new one.');
  setReady(true);
 },[]);
 async function submit(event:FormEvent){
  event.preventDefault();if(busy||!token)return;setBusy(true);setError('');
  try{
   const response=await fetch('/api/auth/recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token_hash:token})}),result=await response.json();
   if(!response.ok)throw Error(result.error||'We could not check this reset link.');
   window.location.replace('/auth/update-password');
  }catch(e){setError(e instanceof Error?e.message:'We could not check this reset link. Please try again.');setBusy(false);}
 }
 return <AccountJourneyCard eyebrow="Password recovery" title="Reset your password."><p className="lead">Continue to choose a new password for the account that received this email.</p><p className="journeyHint">You can continue on this device. Your password will stay unchanged until you enter and save a new one.</p><form onSubmit={submit}><button className="button dark" type="submit" disabled={!ready||!token||busy}>{busy?'Checking your link…':'Continue to reset password'}</button></form>{error&&<p role="alert" className="formStatus error">{error}</p>}<div className="actions"><a className="button ghost" href="/signin?mode=reset">Request a new reset email</a><a href="/signin">Back to sign in</a></div></AccountJourneyCard>;
}
