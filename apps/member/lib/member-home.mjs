import {placementJourney} from './placement-journey.mjs';
// Presentation priorities only. All decisions remain in the existing guarded journeys.
/** @typedef {import('./lab').LabCard} HomeCard */
/** @typedef {{kind:string,badge:string,title:string,description:string,label:string,href:string,project:HomeCard|null}} HomeAction */
/**
 * @param {{cards?:HomeCard[],applications?:Array<{project_ref:string}>,applicationCount?:number,profilePercent?:number,labFailed?:boolean,applicationsFailed?:boolean,now?:number,progress?:ReturnType<import('./member-progress.mjs').memberProgress>}} [options]
 */
export function memberHome({cards=[],applications=[],applicationCount=applications.length,profilePercent=0,labFailed=false,applicationsFailed=false,now=Date.now(),progress}={}){
 const confirmed=cards.filter(c=>c.membership_status==='confirmed');
 const accessible=c=>c.lab_enabled===true&&c.can_enter===true;
 const active=confirmed.filter(c=>c.team_status==='active'&&accessible(c));
 const offered=cards.filter(c=>c.membership_status==='offered');
 const liveOffers=offered.filter(c=>!c.offer_expires_at||Date.parse(c.offer_expires_at)>now).slice().sort((a,b)=>(Date.parse(a.offer_expires_at)||Infinity)-(Date.parse(b.offer_expires_at)||Infinity));
 const nextResponsibility=confirmed.find(c=>['active','forming'].includes(c.team_status)&&(c.commitment_confirmed===false||(c.is_nominee===true&&c.coordinator_agreed===false)||(c.team_status==='forming'&&c.two_person_proposed===true&&c.two_person_agreed===false)));
 const preparing=confirmed.find(c=>['forming','paused','active'].includes(c.team_status)&&!active.includes(c));
 const completed=confirmed.find(c=>c.team_status==='completed'&&accessible(c));
 /** @type {(kind:string,badge:string,title:string,description:string,label:string,href:string,project?:HomeCard|null)=>HomeAction} */
 const make=(kind,badge,title,description,label,href,project=null)=>({kind,badge,title,description,label,href,project});
 let primary;
 if(labFailed)primary=make('unavailable','Try again','Let’s reconnect your workspace.','Your project information could not load. Your placements have not changed.','Open your Lab','/member/lab');
 else if(liveOffers.length)primary=make('offer','Action needed',placementJourney(liveOffers[0]).status,placementJourney(liveOffers[0]).note,'Review your offer','/member/lab',liveOffers[0]);
 else if(nextResponsibility)primary=make('responsibility','Action needed','One step before you move forward.','Your placement has a commitment or team responsibility for you to review.','Review next steps','/member/lab',nextResponsibility);
 else if(active.length){
  const next=progress?.next,card=active.find(c=>c.team_id===next?.card.team_id)||active[0];
  if(next&&next.card.team_id===card.team_id){const item=next.item,milestone=item.kind==='milestone',blocked=item.status==='blocked',review=item.status==='ready_for_review';primary=make('active',milestone?'Your next milestone':review?'Awaiting review':blocked?'A blocker to resolve':'Your next task',item.title,milestone?'You own this milestone. Review the agreed outcome and coordinate the work that moves it forward.':review?'Your task is ready for coordinator review. Revisit the work or check in with your team.':blocked?'This task is marked blocked. Review what is holding it up and ask your team for help.':'One useful step at a time. Pick up your assigned work and keep building with your team.',review?'View your task':blocked?'Review the blocker':'Continue building','/member/lab/'+card.team_id+'?view='+(milestone?'plan':'tasks')+'#'+(milestone?'milestone-':'task-')+item.id,card);}
  else primary=make('active','Active Lab',card.title,card.participation==='solo'?'Pick up your tasks, record your progress and keep building independently.':'Pick up your tasks, connect with your team and keep your contribution moving.','Continue building','/member/lab/'+card.team_id,card);
 }
 else if(preparing)primary=make('preparing',preparing.team_status==='paused'?'Paused':'Getting ready',placementJourney(preparing).status,placementJourney(preparing).note,'View your placement','/member/lab',preparing);
 else if(offered.length)primary=make('placement','Check placement','Check your project offer.','The recorded offer needs a status check. Open your Lab for the current options.','Check your placement','/member/lab',offered[0]);
 else if(applicationsFailed)primary=make('unavailable','Try again','Let’s reconnect your applications.','Your applications could not load. Your submissions have not changed.','View applications','/member/applications');
 else if(applicationCount>0&&applications.some(a=>!confirmed.some(c=>c.project_ref===a.project_ref)))primary=make('applied','Submitted','You’ve taken the first step.','Revisit your submitted interest and the brief behind it. Offers and accepted places appear in your Lab.','View applications','/member/applications');
 else if(completed)primary=make('completed','Completed Lab','Look back at what you built.','Return to your project history and the contributions you recorded. Your completed Lab is read-only.','View your completed Lab','/member/lab/'+completed.team_id,completed);
 else if(applicationCount>0)primary=make('applied','Submitted','Your applications, together.','Your submissions are recorded. You can revisit each application and its project brief.','View applications','/member/applications');
 else if(profilePercent<80)primary=make('profile','Getting started','Make room for your next contribution.','Add the details that help Mettelo understand your experience and where you want to contribute.','Complete your profile','/member/profile');
 else primary=make('explore','Ready when you are','Find a project worth building.','Put your skills into practice. Explore a real-world problem, find a role that fits and apply to contribute.','Explore projects','projects');
 const supporting=active.filter(c=>c.team_id!==primary.project?.team_id).slice(0,2).map(c=>({title:c.title,detail:c.role||'Active Lab',href:'/member/lab/'+c.team_id}));
 if(!applicationsFailed&&primary.kind!=='applied')for(const a of applications){if(supporting.length>=2)break;if(confirmed.some(c=>c.project_ref===a.project_ref)||a.project_ref===primary.project?.project_ref)continue;supporting.push({title:a.project_ref,detail:'Submitted application',href:'/member/projects/'+a.project_ref+'/interest'});}
 const facts=[];
 if(!labFailed&&active.length)facts.push({label:active.length===1?'1 active Lab':active.length+' active Labs',href:'/member/lab'});
 if(!applicationsFailed&&applicationCount>0)facts.push({label:applicationCount===1?'1 submitted application':applicationCount+' submitted applications',href:'/member/applications'});
 return {primary,supporting,facts,profilePercent:Math.max(0,Math.min(100,profilePercent))};
}
