'use client';
import {useRef,useId,type ReactNode} from 'react';
import AppIcon from '@/components/AppIcon';
export default function MarketInviteDialog({name,children}:{name:string;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),title=useId();
 return <><button className="peopleInviteTrigger" type="button" onClick={()=>dialog.current?.showModal()}><AppIcon name="people" size={16}/>Invite to a Lab</button><dialog ref={dialog} className="marketInviteDialog" aria-labelledby={title}><header><div><span className="pcEyebrow">Lab invitation</span><h2 id={title}>Invite {name}</h2></div><button type="button" className="marketDialogClose" aria-label="Close invitation" onClick={()=>dialog.current?.close()}><AppIcon name="close"/></button></header><p>Choose an advertised role in your active Lab. An invitation reserves no place; acceptance checks capacity and the member’s Lab allowance.</p>{children}</dialog></>;
}

