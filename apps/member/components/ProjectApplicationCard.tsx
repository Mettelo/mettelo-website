import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import {websiteProject} from '@/lib/project-catalogue';
import {applicationStatus} from '@/lib/application-status.mjs';
import ParticipationCard from './ParticipationCard';
import {ProjectJourney} from './ProjectJourney';
export type ProjectApplication={id:string;project_ref:string;participation:string;primary_role:string|null;submitted_at:string;review_status?:string|null};
export default function ProjectApplicationCard({application,preview=false,placementUnavailable=false}:{application:ProjectApplication;preview?:boolean;placementUnavailable?:boolean}){
 const project=websiteProject(application.project_ref),website=publicWebsiteOrigin();
 const state=applicationStatus(application.review_status);
 const arrangement=application.participation==='solo'?'Solo':application.participation==='team'?'Team':'Flexible';
 const message=placementUnavailable?'Your application is recorded. Placement updates could not load, so we cannot confirm your current offer or Lab status. Reload this page to try again.':application.review_status==='shortlisted'?'Your application has been shortlisted. This is not an offer or a confirmed place. Any placement offer and its response deadline will appear here.':state.message;
 return <ParticipationCard reference={application.project_ref} title={project?.name||application.project_ref} label={project?.track||'Project application'} status={placementUnavailable?'Placement status unavailable':state.label}>
  {!placementUnavailable&&<ProjectJourney application={application}/>}
  <dl className="pcFacts"><div><dt>Preferred role</dt><dd>{application.primary_role||'Not specified'}</dd></div><div><dt>Requested participation</dt><dd>{arrangement}</dd></div></dl>
  <p className="pcCardNote">Submitted <time dateTime={application.submitted_at}>{new Date(application.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'})}</time></p>
  <p className="pcCardNote">{message}</p>
  <footer className="pcCardFooter">{preview?<button className="pcButton" type="button" disabled>View application →</button>:<a className="pcButton" href={`/member/projects/${application.project_ref}/interest`}>View application →</a>}{state.href&&state.href!=='/member/lab'&&<a className="pcTextLink" href={state.href==='projects'?`${website}/projects/`:state.href==='/contact/'?`${website}/contact/`:state.href}>{state.action} →</a>}<a className="pcTextLink" href={`${website}/projects/${application.project_ref.toLowerCase()}/`}>Read brief ↗</a></footer>
 </ParticipationCard>;
}
