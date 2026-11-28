'use client';

import {useEffect,useRef,type ReactNode} from 'react';

// Home links open the referenced item, while the rest of the list stays compact.
export default function WorkspaceDisclosure({id,className,children}:{id:string;className:string;children:ReactNode}){
 const element=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  function reveal(){
   if(window.location.hash!==`#${id}`||!element.current)return;
   element.current.open=true;
   element.current.scrollIntoView({block:'nearest'});
  }
  reveal();window.addEventListener('hashchange',reveal);
  return()=>window.removeEventListener('hashchange',reveal);
 },[id]);
 return <details ref={element} id={id} className={className}>{children}</details>;
}
