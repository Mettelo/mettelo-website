import type {LabCard} from './lab';
import type {ProjectApplication} from '@/components/ProjectApplicationCard';
import {placementJourney} from './placement-journey.mjs';

export function projectJourneys(applications:ProjectApplication[],placements:LabCard[]){
 const groups=new Map<string,{project_ref:string;application?:ProjectApplication;placements:LabCard[]}>();
 for(const application of applications){
  const key=application.project_ref.toUpperCase();
  const group=groups.get(key)||{project_ref:application.project_ref,placements:[]};
  if(!group.application||application.submitted_at>group.application.submitted_at)group.application=application;
  groups.set(key,group);
 }
 for(const placement of placements){
  const key=placement.project_ref.toUpperCase();
  const group=groups.get(key)||{project_ref:placement.project_ref,placements:[]};
  group.placements.push(placement);groups.set(key,group);
 }
 // An unanswered offer takes priority, but every previous/current placement stays available.
 const priority=(card:LabCard)=>card.membership_status==='offered'?0:placementJourney(card).canEnter&&card.team_status==='active'?1:card.team_status==='completed'?3:2;
 for(const group of groups.values())group.placements.sort((a,b)=>priority(a)-priority(b));
 return [...groups.values()];
}
