'use client';
import {useEffect,useRef} from 'react';
import {useRouter} from 'next/navigation';
export default function ProjectDrawer({title,returnTo,children}:{title:string;returnTo:string;children:React.ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),router=useRouter();
 const close=()=>router.replace(returnTo,{scroll:false});
 useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} className="projectDrawer operations" aria-labelledby="project-drawer-title" onCancel={e=>{e.preventDefault();close();}}><header className="projectDrawerHeader"><div><span className="eyebrow">PROJECT OPERATIONS</span><h2 id="project-drawer-title">{title}</h2></div><button type="button" className="opsClose" onClick={close} aria-label="Close project details">×</button></header><div className="projectDrawerBody">{children}</div></dialog>;
}
