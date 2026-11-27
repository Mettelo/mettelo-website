export function existingLabJourney(card){
 const canEnter=card.membership_status==='confirmed'&&card.can_enter===true&&card.lab_enabled===true&&['active','completed'].includes(card.team_status);
 if(card.legacy_review)return {canEnter:false,status:'Assignment needs review',message:'Your existing assignment has been found. Mettelo needs to review its access setup. You do not need to apply again.'};
 if(card.legacy_source_status==='Awaiting acknowledgement')return {canEnter:false,status:'Awaiting your acknowledgement',message:'You have an existing team assignment. Contact Mettelo to confirm your next step; a new project application is not needed.'};
 if(card.team_status==='paused')return {canEnter:false,status:'Lab paused',message:'Your existing place is retained while the Lab is paused. Follow up with Mettelo about restarting.'};
 if(canEnter)return {canEnter:true,status:card.team_status==='completed'?'Completed Lab':'Lab ready',message:card.team_status==='completed'?'Revisit your completed project work. This Lab is read-only.':'Your existing Lab is ready. Pick up your project work with your team.'};
 return {canEnter:false,status:'Place confirmed · preparing',message:'Your existing place is confirmed. Your team or access setup is still being prepared. You do not need to apply again.'};
}
