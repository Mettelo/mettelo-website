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
import type {ParticipationUsage} from '@/components/lab/LabParticipationUsage';
import {feedReadQuery} from '@/lib/market-feed.mjs';
import {Notices} from './CommunityControls';
import MarketFeed from './MarketFeed';
import FeedIcon from './FeedIcon';
import './feed.css';
import './workspace.css';
const initials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()||'M';
function Usage({usage}:{usage:ParticipationUsage|null}){return <section className="feedRailSection"><h2>Your Mettelo Labs</h2>{usage?<><div className="feedUsage"><strong>{usage.used} of {usage.allowance} Lab slots used</strong><span>{usage.available} available</span></div><div className="feedUsageTrack" aria-hidden="true"><span style={{width:Math.min(100,usage.allowance>0?usage.used/usage.allowance*100:100)+'%'}}/></div><p>{usage.active} active · {usage.paused} paused · {usage.reserved} reserved{usage.revoking>0?` · ${usage.revoking} awaiting revocation`:''}</p></>:<p role="status">Lab usage could not load.</p>}<Link href="/member/lab">Continue your Lab →</Link><details className="feedSlotPolicy"><summary>How slots work</summary><p>Paused Labs, accepted places awaiting readiness and live official offers hold a slot. Completed Labs, declined offers and fully exited memberships do not. Required access revocation must finish before a departing place releases its slot. Pending Market requests and invitations reserve nothing.</p><p>You can still use the community, discovery and permitted messages when your Lab allowance is full.</p></details></section>;}
export default async function MarketHome({query}:{query:Record<string,string|undefined>}){
 const {db,user}=await labSession();if(!user)redirect('/signin?next=%2Fmember%2Fmarket');
 let name='Mettelo member',skill='';try{const {data}=await db.from('profiles').select('full_name,username,skills').eq('id',user.id).maybeSingle();name=data?.full_name||data?.username||name;skill=(data?.skills||'').split(',').map((s:string)=>s.trim()).find(Boolean)?.slice(0,80)||'';}catch{}
 const view=['following','bookmarks'].includes(query.view||'')?query.view!:'all',category=['updates','projects','ideas','seeking'].includes(query.category||'')?query.category!:'all',q=(query.q||'').trim().slice(0,150);
 let feedPayload:Record<string,string>={q,view,category},invalidCursor=false;
 try{feedPayload=feedReadQuery(new URLSearchParams(Object.entries(query).filter(([,v])=>typeof v==='string') as [string,string][])).payload;}catch{invalidCursor=true;}
 const result=await Promise.allSettled([discoveryRpc(db,'suggestions'),invalidCursor?Promise.reject(Error('Invalid feed link')):communityRpc(db,'feed',feedPayload),labRpc(db,'participation_usage'),marketRpc(db,'my_labs'),marketRpc(db,'inbox')]);
 const people:MarketPerson[]=result[0].status==='fulfilled'?(result[0].value?.rows||[]).filter((p:MarketPerson)=>p.id!==user.id).slice(0,3):[],posts:CommunityPost[]=result[1].status==='fulfilled'?result[1].value.rows:[],usage:ParticipationUsage|null=result[2].status==='fulfilled'?result[2].value:null,labs:MarketLab[]=result[3].status==='fulfilled'?result[3].value:[],requests:MarketRequest[]=result[4].status==='fulfilled'?result[4].value.rows||[]:[];
 const pending=requests.filter(r=>r.state==='pending'&&(r.member_id===user.id||r.can_manage));
 const PeoplePanel=()=>(<section className="feedRailSection"><h2>People to follow</h2>{result[0].status==='rejected'?<p role="status">Member suggestions could not load.</p>:people.length===0?<p>You're up to date with suggestions. Discover members who choose to share their profiles.</p>:people.map(p=>{const personName=p.full_name||p.username||'Member';return <div className="marketPersonRow" key={p.id}><Link className="marketPersonIdentity" href={'/member/market/people/'+p.id}><MarketAvatar memberId={p.id} name={personName}/><span><strong>{personName}</strong><small>{p.headline||p.skills?.join(' · ')}</small></span></Link><MarketFollowButton memberId={p.id} name={personName}/></div>;})}<Link href="/member/market?tab=people">Discover people →</Link></section>);
 return <section className="section pcCollection marketCollection marketFeedCollection"><div className="shell">
  <header className="feedHeading"><div><h1>Lab Market</h1><p>Updates, projects and ideas. One community.</p></div><form className="feedSearch" action="/member/market"><FeedIcon name="search"/><label className="feedSrOnly" htmlFor="feed-search">Search the community</label><input id="feed-search" name="q" type="search" maxLength={150} defaultValue={q} placeholder="Search posts, projects and ideas"/>{view!=='all'&&<input type="hidden" name="view" value={view}/ >}{category!=='all'&&<input type="hidden" name="category" value={category}/ >}<button type="submit">Search</button></form><div className="feedHeaderActions"><DismissibleDisclosure className="feedActivityMenu"><summary>Your activity{pending.length>0&&<span className="feedActivityCount">{pending.length}</span>}</summary><nav aria-label="Your private Market activity"><Link href="/member/market?tab=requests">Requests &amp; invitations</Link><Link href="/member/market?tab=manage">Manage recruitment</Link><Link href="/member/market/proposals">Idea drafts &amp; reviews</Link></nav></DismissibleDisclosure><MarketMessageButton icon/></div></header><Notices query={query}/>
  <div className="feedMobileContext"><DismissibleDisclosure className="feedMobileTools"><summary>Your Labs <span>{usage?usage.used+'/'+usage.allowance+' slots used':'View usage'}</span></summary><Usage usage={usage}/></DismissibleDisclosure>
  <DismissibleDisclosure className="marketPeopleMobile"><summary>People <span>Discover</span></summary><PeoplePanel/></DismissibleDisclosure></div>
  <div className="marketFeedLayout"><MarketFeed key={user.id+':'+view+':'+category+':'+q} initialPosts={posts} userId={user.id} name={name} labs={labs} view={view} category={category} query={q} failed={result[1].status==='rejected'} compose={query.compose==='true'} composerNonce={randomUUID()}/>
   <aside className="feedRail" aria-label="Your Labs and community"><Usage usage={usage}/><section className="feedRailSection"><h2>Find collaborators</h2><p>Solo, Team or Flexible? Choose Collaborate in the post editor to share your skills and availability. For an active Lab, its Solo owner or Team coordinator can also open approved recruitment.</p><Link href="/member/market?tab=manage">Create or manage a recruitment post →</Link></section><PeoplePanel/><section className="feedRailSection"><h2>From idea to project</h2><p>Share an idea in the feed to discuss it. Official project review is a separate step in your private activity.</p></section></aside>
  </div></div></section>;
}
