const count=value=>Number.isInteger(value)&&value>=0?value:null;
// Presentation only. The unchanged Market RPC rechecks every permission and capacity at save/admission.
export function recruitmentState(management){
 const capacity=management.recruitment===null?0:count(management.recruitment?.collaborator_capacity);
 const occupied=count(management.occupied),available=capacity!==null&&occupied!==null?Math.max(0,capacity-occupied):null;
 const approved=capacity!==null&&capacity>0,canEdit=management.can_manage===true&&approved;
 const open=management.recruitment?.open===true;
 return {capacity,occupied,available,approved,canEdit,open,
  label:capacity===null?'Capacity unavailable':!approved?'Capacity approval needed':!management.can_manage?'Administrator view':available===0?'No places available':open?'Open to collaborators':'Ready to recruit',
  published:canEdit&&open&&available!==null&&available>0};
}
