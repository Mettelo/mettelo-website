export const currentMembership=m=>['offered','confirmed'].includes(m.status);
export function allocated(interest,teams){return teams.some(t=>t.project_ref===interest.project_ref&&t.members.some(m=>m.user_id===interest.user_id&&currentMembership(m)));}
export function arrangementAllowed(interest,arrangement){return interest.participation===arrangement||interest.participation==='flexible';}
export function coordination(interest){const a=interest.answers||{};return a.coordination_preference||(a.leadership_interest===true?'interested_with_support':'not_confirmed');}
export function formationCandidates(interests,teams,projectRef,arrangement){
 return interests.filter(i=>i.project_ref===projectRef&&i.review_status==='shortlisted'&&!i.restricted&&!allocated(i,teams)&&arrangementAllowed(i,arrangement)&&i.answers?.commitment_response!=='no').sort((a,b)=>{
  const preference=i=>i.participation==='flexible'&&i.answers?.flexible_preference===(arrangement==='team'?'prefer_solo':'prefer_team')?1:0;
  return preference(a)-preference(b)||a.submitted_at.localeCompare(b.submitted_at)||a.id.localeCompare(b.id);
 });
}
// These are review suggestions, never a declaration of compatibility or reservations.
export function proposedGroups(interests,teams,projectRef){
 const team=formationCandidates(interests,teams,projectRef,'team'),solo=formationCandidates(interests,teams,projectRef,'solo');
 const groups=solo.map(i=>({arrangement:'solo',members:[i]}));
 for(let n=0;n+3<=team.length;n+=3)groups.push({arrangement:'team',members:team.slice(n,n+3)});
 return groups;
}
export function assignedResponsibilities(value){return [...new Set((Array.isArray(value)?value:typeof value==='string'?[value]:[]).filter(r=>typeof r==='string'&&r.trim()).map(r=>r.trim()))];}
export function proposalResponsibilities(arrangement,value,requiredRoles=[]){return assignedResponsibilities([...assignedResponsibilities(value),...(arrangement==='solo'?requiredRoles:[])]);}
export function validateProposal({members,arrangement,roles,requiredRoles=[],projectRoles,nominee,capacity=4,twoPersonReason=''}){
 if(!['solo','team'].includes(arrangement))return 'Choose Solo or Team.';
 if(members.length<(arrangement==='solo'?1:twoPersonReason.trim().length>=8?2:3)||members.length>(arrangement==='solo'?1:capacity))return arrangement==='solo'?'Select one solo owner.':`Select between three and ${capacity} members.`;
 if(new Set(members.map(i=>i.user_id)).size!==members.length)return 'Each person can appear only once.';
 if(members.some(i=>i.review_status!=='shortlisted'||i.restricted||!arrangementAllowed(i,arrangement)||i.answers?.commitment_response==='no'))return 'Choose shortlisted applicants who can accept this arrangement and commitment.';
 const assigned=Object.fromEntries(members.map(i=>[i.id,proposalResponsibilities(arrangement,roles[i.id],requiredRoles)]));
 if(members.some(i=>!assigned[i.id].length))return 'Assign at least one project responsibility to each person.';
 if(projectRoles&&(requiredRoles.some(r=>!projectRoles.includes(r))||members.some(i=>assigned[i.id].some(r=>!projectRoles.includes(r)))))return 'Choose responsibilities from this project.';
 if(requiredRoles.some(r=>!members.some(i=>assigned[i.id].includes(r))))return 'Cover each essential responsibility before offering this group.';
 if(arrangement==='team'&&(!nominee||!members.some(i=>i.user_id===nominee&&['comfortable','interested_with_support'].includes(coordination(i)))))return 'Nominate a selected member who has expressed interest in coordinating.';
 return '';
}
