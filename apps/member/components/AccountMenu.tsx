'use client';
import AppIcon from '@/components/AppIcon';
import Link from 'next/link';
import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import type {ReactNode} from 'react';
import {useEffect,useRef,useState} from 'react';
import DismissibleDisclosure from './DismissibleDisclosure';
import Icon from './NavigationIcon';
import data from './navigation.snapshot.json';
export type HeaderAccount={name:string;fullName:string;avatar:string|null;administration:boolean};
export default function AccountMenu({account,runtime='',context='member',inline=false,children}:{account:HeaderAccount;runtime?:string;context?:'member'|'public';inline?:boolean;children?:ReactNode}){
 const image=useRef<HTMLImageElement|null>(null),[loadedAvatar,setLoadedAvatar]=useState<string|null>(null),[failedAvatar,setFailedAvatar]=useState<string|null>(null);
 useEffect(()=>{if(image.current?.complete&&image.current.naturalWidth>0)setLoadedAvatar(account.avatar);},[account.avatar]);
 const avatar=<span className="mnAvatar" aria-hidden="true"><span className="mnAvatarFallback">{account.name.slice(0,1).toUpperCase()}</span>{account.avatar&&failedAvatar!==account.avatar&&<img ref={image} src={account.avatar} width="34" height="34" fetchPriority="high" alt="" data-ready={loadedAvatar===account.avatar} onLoad={()=>setLoadedAvatar(account.avatar)} onError={()=>setFailedAvatar(account.avatar)}/>}</span>;
 const row=(item:{href:string;icon:string;label:string})=><Link className="mnAccountRow" href={runtime+item.href} key={item.href}><Icon name={item.icon}/><span>{item.label}</span><span className="mnRowArrow" aria-hidden="true"><AppIcon name="chevron"/></span></Link>;
 const groups=[{label:'Your workspace',items:data.workspace},...data.account];
 const panel=<nav className={inline?'mnUnifiedAccount':'mnAccountPanel'} aria-label={inline?'Your Mettelo space':'Your account'}><div className="mnAccountIdentity">{avatar}<div><strong>{account.fullName}</strong><small>Your Mettelo account</small></div>{!inline&&<button className="mnCloseAccount" type="button" aria-label="Close account menu"><Icon name="close"/></button>}</div>{groups.map(group=><section className="mnAccountGroup" key={group.label}><h2>{group.label}</h2>{group.items.map(row)}</section>)}{context==='member'&&<section className="mnAccountGroup"><a className="mnAccountRow" href={publicWebsiteOrigin()}><Icon name="compass"/><span>Explore Mettelo</span><span className="mnRowArrow" aria-hidden="true"><AppIcon name="chevron"/></span></a></section>}{account.administration&&<section className="mnAccountGroup">{row({href:'/admin',icon:'shield',label:'Administration'})}</section>}{children}<form className="mnSignOut" action="/auth/signout" method="post"><button className="mnAccountRow mnExit" type="submit"><Icon name="exit"/>Sign out</button></form></nav>;
 return inline?panel:<DismissibleDisclosure className="mnAccount"><summary aria-label="Open account menu">{avatar}<span className="mnAccountName">{account.name}</span><span className="mnCaret" aria-hidden="true"><Icon name="down"/></span></summary>{panel}</DismissibleDisclosure>;
}
