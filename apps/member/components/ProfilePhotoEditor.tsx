'use client';
import {useState,useRef} from 'react';
import {useRouter} from 'next/navigation';
export default function ProfilePhotoEditor({photoUrl}:{photoUrl:string|null}){
 const router=useRouter();const input=useRef<HTMLInputElement>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function save(remove=false){
  if(busy)return;const file=input.current?.files?.[0];if(!remove&&!file){setMessage('Choose a photo first.');return;}
  if(file&&!remove&&file.size>5*1024*1024){setMessage('Choose a photo up to 5 MB.');return;}
  setBusy(true);setMessage('');
  try{const body=new FormData();if(file)body.append('avatar',file);const response=await fetch('/api/profile/avatar',{method:remove?'DELETE':'POST',body:remove?undefined:body});const result=await response.json();if(!response.ok){setMessage(result.error||'Photo could not be saved.');return;}if(input.current)input.current.value='';setMessage(remove?'Profile photo removed.':'Profile photo saved.');router.refresh();}
  catch{setMessage('Photo could not be saved. Please try again.');}finally{setBusy(false);}
 }
 return <section className="profilePhoto panel" aria-labelledby="photo-title" aria-busy={busy}><h2 id="photo-title">Profile photo</h2>{photoUrl?<img className="profilePhotoPreview" src={photoUrl} alt="Your current profile photo" width="96" height="96"/>:<div className="profilePhotoEmpty">No photo yet</div>}<p>Your photo appears in your member account menu. Adding a photo is optional.</p><label htmlFor="profile-photo">Choose a JPG, PNG or WebP photo (up to 5 MB)</label><input ref={input} id="profile-photo" type="file" aria-describedby="photo-save-help" accept="image/jpeg,image/png,image/webp" disabled={busy}/><div className="actions"><button className="button dark" type="button" disabled={busy} onClick={()=>save()}>{busy?'Updating…':'Save photo'}</button>{photoUrl&&<button className="button ghost" type="button" disabled={busy} onClick={()=>save(true)}>Remove photo</button>}</div><p id="photo-save-help" className="tinyNote">Photo changes save separately from the profile form below. Save any profile edits before updating your photo.</p><p role="status" aria-live="polite">{message}</p></section>;
}
