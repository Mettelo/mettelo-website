'use client';
import {useEffect,useRef,type ReactNode} from 'react';

/** Native disclosure with consistent dismissal; never owns authentication state. */
export default function DismissibleDisclosure({className,children}:{className:string;children:ReactNode}){
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const node=ref.current;if(!node)return;
  const outside=(event:Event)=>{if(event.target instanceof Node&&!node.contains(event.target))node.open=false;};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&node.open){node.open=false;node.querySelector('summary')?.focus();}};
  const resized=()=>{node.open=false;};
  const toggle=()=>{if(node.open)document.querySelectorAll<HTMLDetailsElement>('details[data-dismissible]').forEach(other=>{if(other!==node)other.open=false;});};
  window.addEventListener('resize',resized);document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);document.addEventListener('keydown',escape);node.addEventListener('toggle',toggle);
  return()=>{window.removeEventListener('resize',resized);document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside);document.removeEventListener('keydown',escape);node.removeEventListener('toggle',toggle);};
 },[]);
 return <details ref={ref} className={className} data-dismissible onClick={event=>{const target=event.target;if(target instanceof Element&&target.closest('a,button')&&!target.closest('summary'))event.currentTarget.open=false;}} onSubmit={event=>{event.currentTarget.open=false;}}>{children}</details>;
}
