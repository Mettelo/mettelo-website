const blockers={
 'Solo owner accepted':'You need to accept your Solo offer.',
 'Required members accepted':'Waiting for enough teammates to accept their places.',
 'No unanswered offers':'Waiting for the remaining offer responses.',
 'Essential responsibilities covered':'Mettelo is confirming responsibility coverage.',
 'Solo ownership confirmed':'Mettelo is confirming your Solo ownership.',
 'Coordinator agreed':'The nominated coordinator needs to agree to coordinate.',
 'Working commitments confirmed':'Members need to confirm their working commitments.',
 'Repository access checked':'Mettelo needs to verify repository access.',
 'Lab prepared':'Your starter workspace is being prepared.',
 'Milestones assigned':'Mettelo is checking the starting milestone and its owner.',
 'Two-person agreement, if needed':'Both members need to agree to the two-person arrangement.',
 'Member access available':'Mettelo is reviewing account access for this placement.',
 'Lab capacity available':'Mettelo is checking availability to open this Lab.'
};
export function placementJourney(card){
 const solo=card.participation==='solo',arrangement=solo?'Solo':'Team',offered=card.membership_status==='offered';
 const canEnter=card.membership_status==='confirmed'&&card.lab_enabled===true&&card.can_enter===true&&['active','completed'].includes(card.team_status);
 const pending=(card.readiness?.checks||[]).filter(c=>c.ready!==true).map(c=>blockers[c.label]||'Mettelo is completing a placement check.');
 const status=offered?`${arrangement} placement offered`:card.team_status==='paused'?`${arrangement} Lab paused`:card.team_status==='completed'?`${arrangement} Lab completed`:canEnter?`${arrangement} Lab active`:`${arrangement} placement accepted`;
 const arrangementNote=card.admission_route==='market'?'You joined through Lab Market. The original official formation is unchanged. External repository access is handled separately.':solo?'Your official placement remains Solo. Once active, you may recruit Market collaborators within separately approved capacity.':'You are joining an official team. Market collaborators use separately approved seats and do not change its original formation.';
 const preferenceNote=card.requested_participation==='flexible'?`You applied with a Flexible preference. This placement is ${arrangement}.`:'';
 const note=offered?`Mettelo has offered you a ${arrangement} placement. Review the responsibilities and accept once if it fits.`:card.team_status==='paused'?'Your work is paused. Mettelo will confirm the next steps with you.':card.team_status==='completed'?'Your completed work is available to revisit. This Lab is read-only.':canEnter?`Your ${arrangement} Lab is ready. Continue your project work.`:'You have accepted your place. No second acceptance is needed. Your Lab opens automatically when the remaining checks are complete.';
 return {solo,arrangement,offered,canEnter,pending,status,note,arrangementNote,preferenceNote};
}
export function labReadOnlyMessage({status,solo=false,isMember=true}){
 const name=solo?'Solo Lab':'Team Lab';
 if(!isMember)return 'Staff preview: only assigned project members can write here.';
 if(status==='forming')return `This ${name} is being prepared. Chat becomes available when the Lab opens.`;
 if(status==='paused')return `This ${name} is paused. You can read previous messages; writing resumes when Mettelo reopens the Lab.`;
 if(status==='completed')return `This completed ${name} is read-only. Your conversation remains available.`;
 return 'Your project access is being checked. Contact Mettelo if you need help.';
}
