import {MarketMessageButton} from '@/components/MarketMessaging';
import Link from 'next/link';
import type {ReactNode} from 'react';
import LabUsage,{type ParticipationUsage} from '@/components/lab/LabParticipationUsage';
import MarketNavigation from './MarketNavigation';
import './feed.css';
import './workspace.css';

export {default as MarketNavigation} from './MarketNavigation';
export default function MarketWorkspace({active,title,description,action,usage,children}:{active:string;title:string;description:string;action?:ReactNode;usage?:ParticipationUsage|null;children:ReactNode}){
 return <section className={'section pcCollection marketCollection marketFeedCollection marketWorkspace workspace-'+active}><div className="shell">
  <header className="workspaceHeading"><div><Link className="workspaceBack" href="/member/market"> Connect</Link><h1>{title}</h1><p>{description}</p></div><div className="workspaceHeaderActions">{action}{active!=='messages'&&<MarketMessageButton icon/>}</div></header>
  <MarketNavigation active={active}/>{active!=='manage'&&usage&&<Link className="workspaceMobileAllowance" href="/member/lab"><span>{usage.used}/{usage.allowance} Lab slots used</span><strong>View your Labs</strong></Link>}
  <div className="marketFeedLayout"><div className="workspaceContent">{['requests','manage','proposals'].includes(active)&&<nav className="marketActions" aria-label="Private activity"><Link href="/member/market?tab=requests" aria-current={active==='requests'?'page':undefined}>Requests &amp; invitations</Link><Link href="/member/market?tab=manage" aria-current={active==='manage'?'page':undefined}>Recruitment</Link><Link href="/member/market/proposals" aria-current={active==='proposals'?'page':undefined}>Idea drafts</Link></nav>}{children}</div><aside className="workspaceRail" aria-label="Your Connect">
   {active!=='manage'&&usage!==undefined&&<section className="feedRailSection feedUsageCard"><LabUsage usage={usage||null} compact/></section>}
   {active==='manage'?<section className="feedRailSection workspaceTip"><h2>Recruitment support</h2><p>Collaborator places are approved separately from official team size. Each collaborator also needs an available personal Lab slot when admitted.</p><Link href="/member/enquiries">Contact Mettelo</Link><Link href="/member/lab">View your Labs</Link></section>:<details className="feedRailHelp"><summary>Collaboration help</summary><p>Start with a conversation. A request or invitation only becomes a Lab place after acceptance and participation checks.</p><Link href="/member/market?tab=people">Find people</Link></details>}
  </aside></div>
 </div></section>;
}
