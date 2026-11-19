import MarketNavigation from './MarketNavigation';
import {MarketMessageButton} from '@/components/MarketMessaging';
import MarketAvatar from '@/components/MarketAvatar';
import MarketFollowButton from '@/components/MarketFollowButton';
import {discoveryRpc} from '@/lib/market-discovery';
import DismissibleDisclosure from '@/components/DismissibleDisclosure';
import {randomUUID} from 'node:crypto';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {labSession,labRpc} from '@/lib/lab';
import {marketRpc,type MarketPerson,type MarketLab,type MarketRequest} from '@/lib/lab-market';
import {communityRpc,type CommunityPost} from '@/lib/market-community';
import LabUsage,{type ParticipationUsage} from '@/components/lab/LabParticipationUsage';
import {feedReadQuery} from '@/lib/market-feed.mjs';
import {Notices} from './CommunityControls';
import MarketFeed from './MarketFeed';
import FeedIcon from './FeedIcon';
import './feed.css';
import './workspace.css';
const initials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()||'M';
function Usage({usage}:{usage:ParticipationUsage|null}){return <section className="feedRailSection feedUsageCard"><LabUsage usage={usage} compact/></section>;}
export default async function MarketHome({query}:{query:Record<string,string|undefined>}){
 const {db,user}=await labSession();if(!user)redirect('/signin?next=%2Fmember%2Fmarket');
 let name='Mettelo member',skill='';try{const {data}=await db.from('profiles').select('full_name,username,skills').eq('id',user.id).maybeSingle();name=data?.full_name||data?.username||name;skill=(data?.skills||'').split(',').map((s:string)=>s.trim()).find(Boolean)?.slice(0,80)||'';}catch{}
 const view=['following','bookmarks'].includes(query.view||'')?query.view!:'all',category=['updates','projects','ideas','seeking'].includes(query.category||'')?query.category!:'all',q=(query.q||'').trim().slice(0,150);
 let feedPayload:Record<string,string>={q,view,category},invalidCursor=false;
 try{feedPayload=feedReadQuery(new URLSearchParams(Object.entries(query).filter(([,v])=>typeof v==='string') as [string,string][])).payload;}catch{invalidCursor=true;}
 const result=await Promise.allSettled([discoveryRpc(db,'suggestions'),invalidCursor?Promise.reject(Error('Invalid feed link')):communityRpc(db,'feed',feedPayload),labRpc(db,'participation_usage'),marketRpc(db,'my_labs'),marketRpc(db,'inbox')]);
 const people:MarketPerson[]=result[0].status==='fulfilled'?(result[0].value?.rows||[]).filter((p:MarketPerson)=>p.id!==user.id).slice(0,3):[],posts:CommunityPost[]=result[1].status==='fulfilled'?result[1].value.rows:[],usage:ParticipationUsage|null=result[2].status==='fulfilled'?result[2].value:null,labs:MarketLab[]=result[3].status==='fulfilled'?result[3].value:[],requests:MarketRequest[]=result[4].status==='fulfilled'?result[4].value.rows||[]:[];
 const pending=requests.filter(r=>r.state==='pending'&&(r.member_id===user.id||r.can_manage));
 const PeoplePanel=()=>(<section className="feedRailSection"><h2>People to follow</h2>{result[0].status==='rejected'?<p role="status">Member suggestions could not load.</p>:people.length===0?<p>You're up to date with suggestions. Discover members who choose to share their profiles.</p>:people.map(p=>{const personName=p.full_name||p.username||'Member';return <div className="marketPersonRow" key={p.id}><Link className="marketPersonIdentity" href={'/member/market/people/'+p.id}><MarketAvatar memberId={p.id} name={personName}/><span><strong>{personName}</strong><small>{p.headline||p.skills?.join(' · ')}</small></span></Link><MarketFollowButton memberId={p.id} name={personName}/></div>;})}<Link href="/member/market?tab=people">Discover people</Link></section>);
 return <section className="section pcCollection marketCollection marketFeedCollection"><div className="shell">
  <header className="feedHeading"><div><h1>Mettelo Connect</h1><p>Share what you’re learning. Find people to build with.</p></div><form className="feedSearch" action="/member/market"><FeedIcon name="search"/><label className="feedSrOnly" htmlFor="feed-search">Search the community</label><input id="feed-search" name="q" type="search" maxLength={150} defaultValue={q} placeholder="Search posts, projects and ideas"/>{view!=='all'&&<input type="hidden" name="view" value={view}/ >}{category!=='all'&&<input type="hidden" name="category" value={category}/ >}<button type="submit">Search</button></form><div className="feedHeaderActions"><MarketMessageButton icon/></div></header><MarketNavigation active="feed"/><Notices query={query}/>
  <div className="feedMobileContext"><DismissibleDisclosure className="feedMobileTools"><summary>Your Labs <span>{usage?usage.used+'/'+usage.allowance+' slots used':'View usage'}</span></summary><Usage usage={usage}/></DismissibleDisclosure>
  </div>
  <div className="marketFeedLayout"><MarketFeed key={user.id+':'+view+':'+category+':'+q} initialPosts={posts} userId={user.id} name={name} labs={labs} view={view} category={category} query={q} failed={result[1].status==='rejected'} compose={query.compose==='true'} composerNonce={randomUUID()}/>
   <aside className="feedRail" aria-label="Your Labs and community"><Usage usage={usage}/><section className="feedRailSection feedRecruitmentShortcut"><h2>Your collaboration</h2>{pending.length>0&&<Link className="feedPendingLink" href="/member/market?tab=requests">{pending.length} pending {pending.length===1?'response':'responses'}</Link>}<p>Manage recruitment for an active Lab. To offer your own skills, choose Collaborate in the post editor.</p><Link href="/member/market?tab=manage">Manage Lab recruitment</Link></section><PeoplePanel/><details className="feedRailHelp"><summary>From idea to project</summary><p>Share an idea in the feed to discuss it. Official project review is a separate step in your private activity.</p><Link href="/member/market/proposals">Your idea drafts and reviews</Link></details></aside>
  </div></div></section>;
}
