'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import ProjectPublisher from './new/ProjectPublisher';
import './new/publisher.css';
export default function ProjectPublisherModal(){
 const dialog=useRef<HTMLDialogElement>(null),nonce=useRef(''),router=useRouter();
 const [started,setStarted]=useState(false),[open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open,started]);
 return <><button type="button" className="button dark" onClick={()=>{nonce.current||=crypto.randomUUID();setStarted(true);setOpen(true);}}>Add project +</button>
 <dialog ref={dialog} className="publisherModal" aria-label="Add a project" onCancel={event=>{if(busy)event.preventDefault();else setOpen(false);}} onClose={()=>setOpen(false)}>
  <header><span>Project library · Review before publishing</span><button type="button" aria-label="Close project form" disabled={busy} onClick={()=>setOpen(false)}>×</button></header>
  {started&&<ProjectPublisher nonce={nonce.current} embedded onBusyChange={setBusy} onPublished={()=>router.refresh()}/>}
 </dialog></>;
}
