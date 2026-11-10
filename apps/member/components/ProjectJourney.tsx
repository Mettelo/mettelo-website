import type {ProjectApplication} from './ProjectApplicationCard';
import type {LabCard} from '@/lib/lab';
import {applicationStatus} from '@/lib/application-status.mjs';
import {placementJourney} from '@/lib/placement-journey.mjs';

export function ProjectJourney({application,placement}:{application?:ProjectApplication;placement?:LabCard}){
 const accessible=placement?placementJourney(placement).canEnter:false;
 const closed=!placement&&['declined','withdrawn'].includes(application?.review_status||'');
 const unavailable=!placement&&application?.review_status==='unavailable';
 const market=placement?.admission_route==='market';
 const stage=market?(accessible?3:2):placement?(accessible?4:placement.membership_status==='offered'?2:3):application?.review_status==='new'||!application?.review_status||unavailable?0:1;
 const labels=market?['Request / invitation','Mutual agreement','Lab admission',placement?.team_status==='completed'?'Completed':'Working together']:['Applied','Review','Offer','Preparation',placement?.team_status==='completed'&&accessible?'Completed':'Lab ready'];
 return <ol className="pcJourney" aria-label={closed?'Application journey closed':unavailable?'Application journey: latest status unavailable':'Project journey'}>{labels.map((label,index)=><li key={index} data-stage={index<stage?'done':index===stage?'current':'upcoming'} aria-current={index===stage?'step':undefined}><span className="pcJourneyMark" aria-hidden="true">{index<stage||accessible?'✓':index+1}</span><span>{label}{index===stage&&closed&&<small>Closed</small>}{index===stage&&unavailable&&<small>Status unavailable</small>}</span></li>)}</ol>;
}

export function ProjectApplicationHistory({application,preview=false}:{application:ProjectApplication;preview?:boolean}){
 const state=applicationStatus(application.review_status);
 return <details className="pcApplicationHistory"><summary>Application details</summary><div><p>Submitted <time dateTime={application.submitted_at}>{new Date(application.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'})}</time></p><dl className="pcFacts"><div><dt>Requested participation</dt><dd>{application.participation}</dd></div><div><dt>Preferred role</dt><dd>{application.primary_role||'Not specified'}</dd></div></dl><p>Application review: {state.label}. Your current placement status is shown above.</p>{preview?<button className="pcButton" disabled>View submitted answers</button>:<a className="pcTextLink" href={`/member/projects/${application.project_ref}/interest`}>View submitted answers →</a>}</div></details>;
}
