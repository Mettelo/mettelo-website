import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import {redirect} from 'next/navigation';
import {labSession,labRpc,type LabCard} from '@/lib/lab';
import {applicationStatuses} from '@/lib/application-status-server';
import {projectJourneys} from '@/lib/project-journeys';
import ProjectApplicationCard,{type ProjectApplication} from '@/components/ProjectApplicationCard';
import LabPlacementCard from '@/components/lab/LabPlacementCard';
import LabParticipationUsage,{type ParticipationUsage} from '@/components/lab/LabParticipationUsage';
import ParticipationPreviewNotice from '@/components/ParticipationPreviewNotice';
import {exampleLabCards,exampleApplications} from '@/lib/participation-preview';
import './lab.css';
import './journey.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{notice?:string;error?:string;preview?:string}>}){
 const query=await searchParams,preview=process.env.NODE_ENV==='development'&&query.preview==='cards';
 const {db,user}=await labSession();if(!user)redirect(`/signin?next=${encodeURIComponent('/member/lab'+(preview?'?preview=cards':''))}`);
 let cards:LabCard[]=[],applications:ProjectApplication[]=[],labFailed=false,applicationsFailed=false,statusesFailed=false;
 let usage:ParticipationUsage|null=null;
 if(preview){
  cards=exampleLabCards;
  applications=[...exampleApplications,{id:'example-application-awaiting',project_ref:'MTL-DA-002',participation:'team',primary_role:'Data Analyst',submitted_at:'2026-11-05T10:00:00Z',review_status:'shortlisted'}];
 }else{
  const [placements,submissions,statuses,participation]=await Promise.allSettled([
   labRpc(db,'mine'),
   db.from('website_project_interests').select('id,project_ref,participation,primary_role,submitted_at').eq('user_id',user.id).order('submitted_at',{ascending:false}),
   applicationStatuses(db),labRpc(db,'participation_usage')
  ]);
  if(placements.status==='fulfilled'&&Array.isArray(placements.value))cards=placements.value;else labFailed=true;
  if(participation.status==='fulfilled'&&participation.value&&Number.isInteger(participation.value.used)&&Number.isInteger(participation.value.allowance))usage=participation.value as ParticipationUsage;
  if(submissions.status==='fulfilled'&&!submissions.value.error){
   statusesFailed=statuses.status==='rejected';
   applications=(submissions.value.data||[]).map(application=>({...application,review_status:statuses.status==='fulfilled'?statuses.value.get(application.id)||'unavailable':'unavailable'}));
  }else applicationsFailed=true;
 }
 const journeys=projectJourneys(applications,cards),failed=labFailed||applicationsFailed;
 return <section className="section labCollection lx pcCollection pcJourneyCollection"><div className="shell">
  <header className="pcPageHeader"><div><div className="pcEyebrow">My Mettelo · Your project journey</div><h1>Mettelo Lab</h1><p>From your first application to practical work. Follow each project and its next step here.</p></div><a className="pcButton" href={`${publicWebsiteOrigin()}/projects/`}>Find a project →</a></header>
  <ParticipationPreviewNotice page="lab" preview={preview}/>
  <LabParticipationUsage usage={usage} preview={preview}/>
  {query.notice&&<p className="labNotice" role="status">{query.notice}</p>}{query.error&&<p className="labNotice labError" role="alert">{query.error}</p>}
  {(failed||statusesFailed)&&<div className="labNotice labError" role="alert"><p>{labFailed?'Placement updates could not load. Offer and Lab access information may be missing. ':''}{applicationsFailed?'Application records could not load. ':''}{statusesFailed?'Application review updates could not load. ':''}Your records have not changed.</p><a href="/member/lab">Reload your projects →</a></div>}
  {journeys.length?<><div className="pcSectionHeading"><h2>{journeys.length} {journeys.length===1?'project':'projects'}</h2><span className="pcEyebrow">Applications · Offers · Practical work</span></div><div className="pcJourneyList" aria-label="Your project journeys">{journeys.map(journey=><div className="pcProjectJourney" key={journey.project_ref}>{journey.placements.length?<><LabPlacementCard card={journey.placements[0]} application={journey.application} preview={preview}/>{journey.placements.length>1&&<details className="pcOtherPlacements"><summary>Other placements for this project ({journey.placements.length-1})</summary><div className="pcJourneyList">{journey.placements.slice(1).map(card=><LabPlacementCard key={card.team_id} card={card} preview={preview}/>)}</div></details>}</>:journey.application&&<ProjectApplicationCard application={journey.application} preview={preview} placementUnavailable={labFailed}/>}</div>)}</div></>:!failed&&<div className="pcEmpty"><div className="pcEyebrow">Your next practical step</div><h2>Your project journey starts with an application.</h2><p>Choose a project and apply to contribute. Track the review, respond to an offer and enter your Lab here when it is ready.</p><a className="pcButton primary" href={`${publicWebsiteOrigin()}/projects/`}>Find a project →</a></div>}
  <p className="pcHelp">Need to amend an application or ask about your placement? <a href="/member/enquiries">Contact Mettelo →</a></p>
 </div></section>;
}
