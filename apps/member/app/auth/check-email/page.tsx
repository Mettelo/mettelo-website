'use client';

import {useEffect,useState} from 'react';
import AccountJourneyCard from '@/components/AccountJourneyCard';
import {createClient} from '@/lib/supabase/client';
import {safeMemberPath} from '@/lib/auth-navigation.mjs';

function maskEmail(value:string){const [local,domain='']=value.split('@');if(!local||!domain)return value||'your email';const visible=local.slice(0,1);return `${visible}${'*'.repeat(Math.max(3,Math.min(8,local.length-1)))}@${domain}`}
function safeNext(value:string|null){return safeMemberPath(value)}
function authOrigin(){const configured=(process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN||'').trim().replace(/\/$/,'');return configured||(typeof window!=='undefined'?window.location.origin:'http://127.0.0.1:3001')}
function resendErrorMessage(error:unknown){const value=error as {code?:string;message?:string};const code=value?.code||'';const detail=(value?.message||'').toLowerCase();if(code==='over_email_send_rate_limit'||detail.includes('rate limit'))return 'Email sending is temporarily limited. Please wait before requesting another verification or password reset email.';return 'We could not send another verification email. Please try again shortly. If the problem continues, contact Mettelo Support.'}

export default function CheckEmailPage(){
  const [params,setParams]=useState(()=>new URLSearchParams());
  useEffect(()=>{setParams(new URLSearchParams(window.location.search))},[]);
  const email=params.get('email')||'';const next=safeNext(params.get('next'));
  const [cooldown,setCooldown]=useState(0);
  useEffect(()=>{if(cooldown<=0)return;const timer=window.setTimeout(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>window.clearTimeout(timer)},[cooldown]);
  const [status,setStatus]=useState<'idle'|'working'|'success'|'error'>('idle');const [message,setMessage]=useState('');

  async function resend(){if(!email||cooldown>0||status==='working')return;setStatus('working');setMessage('');try{const supabase=createClient();const redirect=`${authOrigin()}/auth/callback?flow=signup&next=${encodeURIComponent(next)}`;const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:redirect}});if(error)throw error;setStatus('success');setMessage('A new verification email has been sent. Please check your inbox.');setCooldown(60)}catch(error){setStatus('error');setMessage(resendErrorMessage(error))}}

  return <AccountJourneyCard eyebrow="Email verification" title="Check your inbox."><p className="lead">If your registration was accepted, a verification link is on its way to <strong>{maskEmail(email)}</strong>.</p><ol className="journeySteps"><li>Open the email from Mettelo.</li><li>Select the verification link.</li><li>Continue setting up your profile.</li></ol><p className="journeyHint">No email yet? Check spam or junk before requesting another link.</p><div className="actions"><button className="button dark" type="button" onClick={resend} disabled={!email||status==='working'||cooldown>0}>{status==='working'?'Sending…':cooldown>0?`Resend in ${cooldown}s`:'Resend verification email'}</button><a className="button ghost" href={`/signin?mode=signup&next=${encodeURIComponent(next)}`}>Change email address</a></div><div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div><a className="journeyBack" href="/signin">Back to sign in →</a></AccountJourneyCard>;
}
