import type {LabCard} from '@/lib/lab';
import {existingLabJourney} from '@/lib/existing-lab-journey.mjs';
import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import ParticipationCard from '../ParticipationCard';
export default function ExistingLabCard({card}:{card:LabCard}){
 const {canEnter,status,message}=existingLabJourney(card);
 const needsGithub=card.membership_status==='confirmed'&&card.github_required===true&&(!card.github_connected||card.github_org_status!=='member');
 return <ParticipationCard reference={card.project_ref} title={card.title} label={`Existing ${card.participation==='solo'?'Solo Lab':card.label}`} status={status} tone={canEnter&&card.team_status==='active'?'active':card.legacy_review||card.legacy_source_status==='Awaiting acknowledgement'?'attention':'neutral'}>
  <p className="pcCardNote">{message}</p>
  <dl className="pcFacts"><div><dt>Recorded team role</dt><dd>{card.legacy_source_role||card.role}</dd></div><div><dt>Working arrangement</dt><dd>{card.participation==='solo'?'Solo':'Team'}</dd></div></dl>
  <footer className="pcCardFooter">{canEnter?<a className="pcButton primary" href={`/member/lab/${card.team_id}`}>{card.team_status==='completed'?'View Lab':'Enter Lab'}</a>:needsGithub?<a className="pcButton primary" href="/member/profile#github-connection-heading">Complete GitHub setup</a>:<a className="pcButton" href="/member/enquiries">Ask about this assignment</a>}<a className="pcTextLink" href={`${publicWebsiteOrigin()}/projects/${card.project_ref.toLowerCase()}/`}>Read brief</a></footer>
 </ParticipationCard>;
}
