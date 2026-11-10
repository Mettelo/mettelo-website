import {websiteProject} from './project-catalogue';
import type {LabCard} from './lab';
import type {ProjectApplication} from '@/components/ProjectApplicationCard';
// UI examples only: never passed to a mutation or written to the database.
export const exampleApplications:ProjectApplication[]=[
 {id:'example-application-1',project_ref:'MTL-DA-001',participation:'team',primary_role:'Data Analyst',submitted_at:'2026-11-03T10:00:00Z'},
 {id:'example-application-2',project_ref:'MTL-AI-010',participation:'flexible',primary_role:'AI Engineer',review_status:'clarification',submitted_at:'2026-11-02T10:00:00Z'},
 {id:'example-application-3',project_ref:'MTL-DE-007',participation:'team',primary_role:'Data Engineer',review_status:'shortlisted',submitted_at:'2026-11-01T10:00:00Z'},
 {id:'example-application-4',project_ref:'MTL-BA-041',participation:'solo',primary_role:'Business Analyst',review_status:'declined',submitted_at:'2026-10-31T10:00:00Z'}
];
function card(ref:string,overrides:Partial<LabCard>):LabCard{return {team_id:`example-${ref}`,project_ref:ref,title:websiteProject(ref)?.name||ref,label:'Example pilot team',team_status:'forming',participation:'team',role:websiteProject(ref)?.roles[0]||'Contributor',membership_status:'confirmed',lab_enabled:true,minimum:3,confirmed:2,access_verified:true,two_person_proposed:false,two_person_agreed:false,commitment_confirmed:true,can_enter:false,...overrides};}
export const exampleLabCards:LabCard[]=[
 card('MTL-DA-001',{team_id:'example-active',team_status:'active',confirmed:4,can_enter:true,label:'Example · Team Atlas'}),
 card('MTL-AI-010',{team_id:'example-offered',membership_status:'offered',label:'Example · Team Horizon',offer_availability:'2–4 hours per week',offer_time_zone:'Europe/London'}),
 card('MTL-DE-007',{team_id:'example-forming',label:'Example · Team Compass'}),
 card('MTL-BA-041',{team_id:'example-completed',team_status:'completed',participation:'solo',role:'Project owner',minimum:1,confirmed:1,can_enter:true,label:'Example · Solo project'})
];
