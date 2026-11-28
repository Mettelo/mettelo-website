'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
export default function AdminCollaborationCapacity({teamId,capacity,occupied}:{teamId:string;capacity:number|null;occupied:number|null}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),router=useRouter();
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const form=event.currentTarget,fields=new FormData(form),body=new URLSearchParams({action:'capacity',team_id:teamId,capacity:String(fields.get('capacity')||'')});
  setBusy(true);setError('');setMessage('');
  try{const response=await fetch('/api/lab-market',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body});const result=await response.json();if(!response.ok)throw Error(result.error||'Capacity could not be saved.');setMessage('Approved collaborator capacity saved. You are still in project administration.');router.refresh();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="adminCollaborationCapacity" aria-labelledby="admin-collaboration-heading"><header><span className="eyebrow">Connect collaborators</span><h3 id="admin-collaboration-heading">Approved collaborator places</h3></header><p>Approve extra collaborator places for this Lab. Official team size and each member’s three-Lab allowance stay separate. The Lab leader manages publishing and invitations.</p><dl><div><dt>Approved</dt><dd>{capacity??'Unavailable'}</dd></div><div><dt>Occupied or revoking</dt><dd>{occupied??'Unavailable'}</dd></div></dl>{capacity===null||occupied===null?<p role="status">Capacity could not be confirmed. Close and reopen the team before editing.</p>:<form onSubmit={event=>void save(event)}><label>Approved collaborator places<input type="number" name="capacity" min={occupied} max={12} defaultValue={capacity} required disabled={busy}/></label><button className="button ghost" disabled={busy}>{busy?'Saving…':'Save collaborator capacity'}</button></form>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</section>;
}

