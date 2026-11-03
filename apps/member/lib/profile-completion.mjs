import {professionalAreas} from './profile-contract.mjs';
export const PROFILE_INTEREST_THRESHOLD=80;
export const completionColumns='full_name,headline,location,bio,professional_area,current_job_title,experience_level,primary_goal,linkedin_url,github_url,portfolio_url,avatar_path';
const filled=v=>typeof v==='string'&&v.trim().length>0;
const https=v=>{try{const u=new URL(v);return u.protocol==='https:'&&Boolean(u.hostname)&&!u.username&&!u.password;}catch{return false;}};
export function profileCompletion(profile={}){
 const items=[['full_name','Full name',filled(profile.full_name)],['headline','Professional headline',filled(profile.headline)],['location','City and country',filled(profile.location)],['bio','About you',filled(profile.bio)],['professional_area','Professional area',professionalAreas.includes(profile.professional_area)],['current_job_title','Current role',filled(profile.current_job_title)],['experience_level','Experience level',['entry','mid','senior','lead','executive'].includes(profile.experience_level)],['primary_goal','Your Mettelo goal',filled(profile.primary_goal)],['professional_link','One professional or portfolio link',[profile.linkedin_url,profile.github_url,profile.portfolio_url].some(https)],['avatar_path','Profile photo',filled(profile.avatar_path)]].map(([key,label,complete])=>({key:String(key),label:String(label),complete:complete===true}));
 const percent=items.filter(item=>item.complete).length*10;return {percent,eligible:percent>=PROFILE_INTEREST_THRESHOLD,items};
}
