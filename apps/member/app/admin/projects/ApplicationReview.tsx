'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {LabInterest} from '@/lib/lab';
type Outcome={placement_state?:string;team_id?:string|null;placement_error?:string|null};
const outcomeText=(state?:string)=>state==='placed'?'Placement assigned. Existing readiness and access checks still apply.':state==='waiting_team'?'Approved and awaiting team formation. No second approval is needed. Waiting does not reserve a Lab slot.':state==='blocked'?'Approved, but placement needs attention. Resolve the requirement below, then retry placement.':'Approved. Placement is being prepared.';
export default function ApplicationReview({interest,projectRoles,formingTeams,returnTo}:{interest:LabInterest;projectRoles:string[];formingTeams:{id:string;label:string}[];returnTo:string}){
 const router=useRouter();
 const [status,setStatus]=useState(interest.review_status||'new'),[decision,setDecision]=useState('approved'),[route,setRoute]=useState(interest.placement_route||(interest.participation==='flexible'?(interest.answers.flexible_preference==='prefer_solo'?'solo':interest.answers.flexible_preference==='prefer_team'?'team':''):interest.participation)),[role,setRole]=useState(interest.placement_role||interest.role||''),[team,setTeam]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
 const [outcome,setOutcome]=useState<Outcome>({placement_state:interest.placement_state,team_id:interest.placement_team_id,placement_error:interest.placement_error});
 const placementUrl=new URL(returnTo,'http://localhost');placementUrl.searchParams.delete('application');placementUrl.searchParams.set('team',outcome.team_id||'');
 async function save(retry=false,reviewDecision=decision){
  if(busy)return;setBusy(true);setFailed(false);setMessage(retry?'Retrying placement…':'Saving decision…');
  const approval=retry||reviewDecision==='approved';
  const payload=new URLSearchParams({action:approval?(retry?'retry':'approve'):'review_interest',interest_id:interest.id,participation:route,role,team_id:route==='team'?team:'',reason:note,review_status:reviewDecision});
  try{
   const response=await fetch(approval?'/api/admin/project-approval':'/api/lab',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:payload});
   const data=await response.json();if(!response.ok)throw Error(data.error||'The decision could not be saved.');
   if(approval){setStatus('approved');setOutcome(data.result);setMessage(outcomeText(data.result.placement_state));}else{setStatus(reviewDecision);setMessage(reviewDecision==='new'?'Review reopened.':reviewDecision==='declined'?'Application rejected. The record remains available under Rejected and All applications.':'Clarification requested. The original application remains available.');}
   router.refresh();
  }catch(e){setFailed(true);setMessage(e instanceof Error?e.message:'The decision could not be saved. Your choices are still here.');}finally{setBusy(false);}
 }
 const approved=status==='approved';
 return <section aria-label="Application decision">
  <h3>{approved?'Approved participation':status==='declined'?'Application rejected':'Review decision'}</h3>
  {message&&<p role={failed?'alert':'status'}>{message}</p>}
  {approved?<>
   <p>{outcomeText(outcome.placement_state)}</p><p>Intended route: <strong>{interest.placement_route||route}</strong> · Responsibility: {interest.placement_role||role}</p>
   {outcome.placement_error&&<p role="alert">Placement requirement: {outcome.placement_error}</p>}
   <div className="opsActions">{outcome.team_id&&<Link className="button dark" href={placementUrl.pathname+placementUrl.search} scroll={false}>View placement and readiness</Link>}{outcome.placement_state==='waiting_team'&&<Link className="button ghost" href={`/admin/projects?section=applications&project=${encodeURIComponent(interest.project_ref)}&form=team`} scroll={false}>Form a team from approved applicants</Link>}<Link href="/admin/projects?section=applications&review=approved">View approved applications</Link></div>
   {['blocked','waiting_team'].includes(outcome.placement_state||'')&&<form onSubmit={e=>{e.preventDefault();void save(true);}}>
    {(interest.placement_route||route)==='team'&&<label>Existing forming team<select value={team} onChange={e=>setTeam(e.target.value)}><option value="">Keep awaiting team formation</option>{formingTeams.map(t=><option value={t.id} key={t.id}>{t.label}</option>)}</select></label>}
    <p>Retry uses the saved approval and checks eligibility, capacity and the shared Lab allowance again.</p><button className="button ghost" disabled={busy}>{busy?'Retrying…':'Retry placement'}</button>
   </form>}
  </>:<form onSubmit={e=>{e.preventDefault();void save();}}>
   <label>Decision<select value={decision} onChange={e=>setDecision(e.target.value)}><option value="approved">Approve participation</option><option value="declined">Reject application</option><option value="clarification">Request clarification</option></select></label>
   {decision==='approved'&&<>
    {interest.participation==='flexible'&&<label>Intended placement route<select required value={route} onChange={e=>setRoute(e.target.value)}><option value="">Choose Solo or Team</option><option value="solo">Solo</option><option value="team">Team</option></select><small>The application keeps its Flexible preference. Only the selected route is created.</small></label>}
    <label>Project responsibility<select required value={role} onChange={e=>setRole(e.target.value)}><option value="">Choose a responsibility</option>{projectRoles.map(r=><option value={r} key={r}>{r}</option>)}</select></label>
    {route==='team'&&<label>Team placement<select value={team} onChange={e=>setTeam(e.target.value)}><option value="">Await team formation</option>{formingTeams.map(t=><option value={t.id} key={t.id}>{t.label}</option>)}</select></label>}
    <p>{route==='solo'?'Approval creates the Solo placement directly. The member then confirms responsibilities and commitment; repository access must be checked before the Lab opens.':'Approval places the applicant in the selected forming team or the existing formation pool. No second approval is needed.'}</p>
   </>}
   <label>Private administrator note{decision!=='approved'?' (required)':''}<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1500} minLength={decision==='approved'?0:8} required={decision!=='approved'}/></label>
   <small>Private notes are never included in member notifications or emails. Existing placements must be resolved before rejection.</small>
   {['declined','withdrawn'].includes(status)?<button className="button ghost" type="button" disabled={busy} onClick={()=>void save(false,'new')}>Reopen review</button>:<button className="button dark" disabled={busy}>{busy?'Saving…':decision==='approved'?'Approve and arrange placement':decision==='declined'?'Reject application':'Request clarification'}</button>}
  </form>}
 </section>;
}
