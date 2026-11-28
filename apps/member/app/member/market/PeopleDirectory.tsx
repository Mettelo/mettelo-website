import Link from 'next/link';
import MarketAvatar from '@/components/MarketAvatar';
import MarketFollowButton from '@/components/MarketFollowButton';
import {MarketMessageButton} from '@/components/MarketMessaging';
import type {MarketLab,MarketPerson} from '@/lib/lab-market';
import {directoryDetailHref} from '@/lib/market-directory.mjs';
import Action from './MarketActionForm';
import MarketInviteDialog from './MarketInviteDialog';
export default function PeopleDirectory({people,labs,userId,query}:{people:MarketPerson[];labs:MarketLab[];userId:string;query:Record<string,string|undefined>}){
 const canInvite=labs.some(l=>l.roles?.length);
 return <div className="marketList peopleDirectory">{people.map(person=>{
 const name=person.full_name||person.username||'Member',href=directoryDetailHref('people',person.id,query),skills=person.skills||[],self=person.id===userId;
 if(self)return <article className="peopleSelfCard" key={person.id}><MarketAvatar memberId={person.id} name={name}/><div><strong>Your community profile</strong><p>See the details you have chosen to share.</p></div><Link href={href}>Preview profile</Link></article>;
 return <article className="marketCard peopleCard" key={person.id} aria-label={name}>
  <header className="peopleIdentity"><Link href={href} className="peopleAvatar" aria-label={"View "+name+"'s profile"}><MarketAvatar memberId={person.id} name={name}/></Link><div><h2><Link href={href}>{name}</Link></h2><p className="marketMeta">{person.username?'@'+person.username:'Community member'}{self?' · You':''}</p></div></header>
  <p className="peopleHeadline">{person.headline||'Explore this member’s shared profile to learn more.'}</p>
  <div className="peopleSkills" aria-label="Shared skills"><div className="marketTags">{skills.slice(0,4).map(skill=><span key={skill}>{skill}</span>)}</div>{skills.length>4&&<details><summary>+{skills.length-4} more skills</summary><div className="marketTags">{skills.slice(4).map(skill=><span key={skill}>{skill}</span>)}</div></details>}</div>
  <footer className="peopleCardActions"><Link className="pcButton primary" href={href}>View profile</Link>{!self&&<MarketFollowButton memberId={person.id} name={name} following={person.following===true}/>}</footer>
  {!self&&person.contactable&&<div className="peopleContactActions"><MarketMessageButton className="peopleMessageTrigger" memberId={person.id} label="Message"/>{canInvite&&<MarketInviteDialog name={name}><Action action="invite" tab="people" member={person.id}><label>Advertised Lab role<select name="lab_role" required>{labs.flatMap(lab=>(lab.roles||[]).map(role=><option key={lab.team_id+role} value={JSON.stringify({team_id:lab.team_id,role})}>{lab.title} · {role}</option>))}</select></label><label>Invitation message<textarea name="proposal" rows={3} minLength={10} maxLength={2000} required/></label><label>Proposed commitment<input name="commitment" minLength={3} maxLength={300} required/></label><button className="pcButton primary">Send invitation</button></Action></MarketInviteDialog>}</div>}
 </article>;
 })}</div>;
}

