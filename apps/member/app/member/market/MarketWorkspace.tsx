import {MarketMessageButton} from '@/components/MarketMessaging';
import DismissibleDisclosure from '@/components/DismissibleDisclosure';
import Link from 'next/link';
import type {ReactNode} from 'react';
import LabUsage,{type ParticipationUsage} from '@/components/lab/LabParticipationUsage';
import FeedIcon from './FeedIcon';
import './feed.css';
import './workspace.css';

const destinations = [
 {id:'feed',href:'/member/market',title:'Community feed',description:'Updates, projects and ideas',icon:'write'},
 {id:'people',href:'/member/market?tab=people',title:'Discover people',description:'Find skills and shared interests',icon:'people'},
 {id:'requests',href:'/member/market?tab=requests',title:'Your activity',description:'Private requests, recruitment and drafts',icon:'arrow'},
] as const;

export function MarketNavigation({active}:{active?:string}){
 return <nav className="marketWorkspaceNavigation" aria-label="Market workspace">{destinations.map(item=><Link key={item.id} href={item.href} aria-current={item.id===active?'page':undefined}><FeedIcon name={item.icon}/><span><strong>{item.title}</strong><small>{item.description}</small></span></Link>)}</nav>;
}

export default function MarketWorkspace({active,title,description,action,usage,children}:{active:string;title:string;description:string;action?:ReactNode;usage?:ParticipationUsage|null;children:ReactNode}){
 return <section className={'section pcCollection marketCollection marketFeedCollection marketWorkspace workspace-'+active}><div className="shell">
  <header className="workspaceHeading"><div><Link className="workspaceBack" href="/member/market">← Lab Market</Link><h1>{title}</h1><p>{description}</p></div><div className="workspaceHeaderActions">{action}{active!=='messages'&&<MarketMessageButton icon/>}</div></header>
  <DismissibleDisclosure key={active} className="workspaceMobileMenu"><summary>Market menu <span>{usage?`${usage.used}/${usage.allowance} Labs`:destinations.find(item=>item.id===active)?.title||'Community'}</span></summary><MarketNavigation active={active}/>{usage!==undefined&&<div className="workspaceMobileUsage"><LabUsage usage={usage}/></div>}</DismissibleDisclosure>
  <div className="marketFeedLayout"><div className="workspaceContent">{['requests','manage','proposals'].includes(active)&&<nav className="marketActions" aria-label="Private activity"><Link href="/member/market?tab=requests" aria-current={active==='requests'?'page':undefined}>Requests &amp; invitations</Link><Link href="/member/market?tab=manage" aria-current={active==='manage'?'page':undefined}>Recruitment</Link><Link href="/member/market/proposals" aria-current={active==='proposals'?'page':undefined}>Idea drafts &amp; reviews</Link></nav>}{children}</div><aside className="workspaceRail" aria-label="Your Market"><section className="feedRailSection workspaceTools"><h2>Your Market</h2><MarketNavigation active={active}/></section>
   {usage!==undefined&&<section className="feedRailSection"><h2>Your Mettelo Labs</h2>{usage?<><strong className="workspaceUsage">{usage.used} of {usage.allowance} Lab slots used</strong><div className="feedUsageTrack" aria-hidden="true"><span style={{width:Math.min(100,usage.allowance>0?100*usage.used/usage.allowance:100)+'%'}}/></div><p>{usage.available} available · {usage.active} active · {usage.paused} paused · {usage.reserved} reserved{usage.revoking>0?` · ${usage.revoking} awaiting access revocation`:""}</p></>:<p role="status">Lab usage could not load.</p>}<Link href="/member/lab">Continue your Lab →</Link><details className="feedSlotPolicy"><summary>How slots work</summary><p>Paused Labs, accepted places awaiting readiness and live official offers hold a slot. Completed Labs, declined offers and fully exited memberships do not. A departing place keeps its slot until required access revocation is complete. Pending Market invitations and requests reserve nothing.</p><p>Community, discovery and permitted messages stay available when your Lab allowance is full.</p></details></section>}
   <section className="feedRailSection workspaceTip"><h2>Build a connection</h2><p>Start with a conversation. A request or invitation only becomes a Lab place after acceptance and participation checks.</p><Link href="/member/market?tab=people">Find people →</Link></section>
  </aside></div>
 </div></section>;
}
