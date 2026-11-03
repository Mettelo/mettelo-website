'use client';

import Link from 'next/link';
import {safeOpportunityLink} from '@/lib/opportunity-links.mjs';
import {useEffect,useMemo,useRef,useState} from 'react';
import {PROJECT_PARTICIPATION_TERMS_FULL,PROJECT_PARTICIPATION_TERMS_SUMMARY,PROJECT_PARTICIPATION_TERMS_VERSION} from '@/lib/project-participation-terms';
import {participationOptions,type ProjectParticipationMode,type ParticipationPreference} from '@/lib/project-admission';

type FlexiblePreference='prefer_team'|'prefer_solo'|'no_preference';
type Commitment='yes'|'yes_with_limitations'|'no'|'';
type Role={id:string;title:string;description:string|null;openings:number;roleStatus:string};
type Props={
  project:{id:string;title:string;commitment:string|null;participationMode:ProjectParticipationMode};
  roles:Role[];
  profileSkills:string[];
  initialAvailability:string;
  initialPortfolioUrl:string;
  collaborationNeedId?:string|null;
};

const steps=['Participation','Role & Contribution','Availability','Fit','Review'];
const areas=['Analysis & insight','Data preparation','Engineering & implementation','Research','Testing & quality','Documentation','Presentation & storytelling','Project coordination'];
const csv=(value:string)=>[...new Set(value.split(',').map(v=>v.trim()).filter(Boolean))].slice(0,20);

export default function MemberProjectInterestFlowV3({project,roles,profileSkills,initialAvailability,initialPortfolioUrl,collaborationNeedId=null}:Props){
  const allowed=participationOptions(project.participationMode);
  const [step,setStep]=useState(0);
  const [participation,setParticipation]=useState<ParticipationPreference>(allowed[0]);
  const [teamPreference,setTeamPreference]=useState('either');
  const [primaryRoleId,setPrimaryRoleId]=useState('');
  const [secondaryRoleId,setSecondaryRoleId]=useState('');
  const [roleFit,setRoleFit]=useState('');
  const [flexiblePreference,setFlexiblePreference]=useState<FlexiblePreference>('no_preference');
  const [contributionAreas,setContributionAreas]=useState<string[]>([]);
  const [leadership,setLeadership]=useState(false);
  const [commitment,setCommitment]=useState<Commitment>('');
  const [availability,setAvailability]=useState(initialAvailability);
  const [availabilityNote,setAvailabilityNote]=useState('');
  const [collaborationAvailability,setCollaborationAvailability]=useState('');
  const [motivation,setMotivation]=useState('');
  const [skills,setSkills]=useState(profileSkills.join(', '));
  const [contribution,setContribution]=useState('');
  const [portfolioUrl,setPortfolioUrl]=useState(initialPortfolioUrl);
  const [terms,setTerms]=useState(false);
  const [working,setWorking]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [message,setMessage]=useState('');
  const heading=useRef<HTMLHeadingElement>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const isSolo=participation==='solo';
  const primaryRole=useMemo(()=>roles.find(role=>role.id===primaryRoleId)||null,[roles,primaryRoleId]);
  const secondaryRole=useMemo(()=>roles.find(role=>role.id===secondaryRoleId)||null,[roles,secondaryRoleId]);

  useEffect(()=>{if(isSolo){setPrimaryRoleId('');setSecondaryRoleId('');setRoleFit('');setLeadership(false);setCollaborationAvailability('')}},[isSolo]);
  useEffect(()=>{if(secondaryRoleId===primaryRoleId)setSecondaryRoleId('')},[primaryRoleId,secondaryRoleId]);

  function go(value:number){setMessage('');setStep(value);requestAnimationFrame(()=>heading.current?.focus())}
  function validate(value:number){
    if(value===1&&participation==='team'&&!primaryRoleId)return'Select the primary role you want to contribute through.';
    if(value===1&&primaryRoleId&&secondaryRoleId===primaryRoleId)return'Choose a different secondary role.';
    if(value===2&&!commitment)return'Confirm whether you can agree a realistic commitment.';
    if(value===3&&motivation.trim().length<20)return'Tell us why you want to work on this project (at least 20 characters).';
    if(value===3&&contribution.trim().length<40)return'Tell us what you would contribute (at least 40 characters).';
    if(value===3&&portfolioUrl.trim()&&!safeOpportunityLink(portfolioUrl.trim()))return'Use a full HTTPS professional link without login details, or leave it blank.';
    return'';
  }
  function next(){const error=validate(step);if(error){setMessage(error);return}go(Math.min(4,step+1))}
  function toggle(area:string){setContributionAreas(current=>current.includes(area)?current.filter(v=>v!==area):[...current,area])}
  async function submit(){
    if(working)return;
    for(let i=0;i<4;i++){const error=validate(i);if(error){go(i);setMessage(error);return}}
    if(!terms){setMessage('Read and agree to the Project Participation Terms before submitting.');return}
    setWorking(true);setMessage('Submitting your project interest…');
    try{
      const response=await fetch('/api/project-interest',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        project_id:project.id,application_kind:'interest',participation_preference:participation,team_formation_preference:isSolo?'either':teamPreference,
        flexible_preference:participation==='flexible'?flexiblePreference:null,
        project_role_id:isSolo?null:primaryRoleId||null,
        secondary_project_role_id:isSolo?null:secondaryRoleId||null,
        role_fit_statement:isSolo?null:roleFit.trim()||null,
        leadership_interest:isSolo?false:leadership,contribution_areas:contributionAreas,
        commitment_response:commitment,availability:availability.trim()||null,availability_note:availabilityNote.trim()||null,
        collaboration_availability:isSolo?null:collaborationAvailability.trim()||null,
        motivation_statement:motivation.trim(),relevant_skills:csv(skills),contribution_statement:contribution.trim(),
        portfolio_url:portfolioUrl.trim()||null,collaboration_need_id:collaborationNeedId||null,
        terms_accepted:true,terms_version:PROJECT_PARTICIPATION_TERMS_VERSION
      })});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'We could not submit your interest.');
      if(!body.application?.id)throw new Error('Your submission could not be confirmed. Your responses are still here.');
      setSubmitted(true);setMessage('Interest submitted.');
    }catch(error){setMessage(error instanceof Error?error.message:'We could not submit your interest. Your responses are still here.')}finally{setWorking(false)}
  }

  if(submitted)return <section className="mpi3Success" aria-live="polite"><div className="mpi3Eyebrow">INTEREST SUBMITTED</div><h2>Your interest has been submitted</h2><p>Mettelo received your interest in <strong>{project.title}</strong>.</p><div className="mpi3Actions"><Link className="mpi3Button mpi3Primary" href="/member/applications">View interest</Link><Link className="mpi3Button" href={`/member/projects/${project.id}/interest`}>Back to project</Link></div><style jsx global>{styles}</style></section>;

  return <div className="mpi3Flow" aria-busy={working}><nav className="mpi3Progress" aria-label="Interest form progress">{steps.map((label,index)=><button key={label} type="button" aria-current={index===step?'step':undefined} disabled={working||index>step} onClick={()=>index<step&&go(index)} className={index===step?'current':''}><small>Step {index+1} of {steps.length}</small><strong>{label}</strong></button>)}</nav><section className="mpi3Card"><h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
    {step===0&&<><p>Choose your working preference. Mettelo will confirm which arrangements are available for this brief.</p><div className="mpi3Choices">{allowed.map(value=><label key={value}><input type="radio" name="participation" checked={participation===value} onChange={()=>setParticipation(value)}/><span><strong>{value==='solo'?'Solo':value==='team'?'Team':'Flexible'}</strong><small>{value==='solo'?'Own the complete project outcome.':value==='team'?'Work with a project team.':'Stay open to either supported way of working.'}</small></span></label>)}</div>{!isSolo&&<fieldset><legend>Team formation preference</legend><p>Several teams can work on the same brief. This preference does not reserve a place or create a team automatically.</p>{[['join_forming','Join a forming team'],['form_new','Help form another team'],['either','Open to either']].map(([value,label])=><label className="mpi3Line" key={value}><input type="radio" name="team_formation_preference" checked={teamPreference===value} onChange={()=>setTeamPreference(value)}/>{label}</label>)}</fieldset>}{participation==='flexible'&&<fieldset><legend>Working preference</legend>{([['prefer_team','Prefer team, but I can work solo'],['prefer_solo','Prefer solo, but I can join a team'],['no_preference','No preference']] as [FlexiblePreference,string][]).map(([value,label])=><label className="mpi3Line" key={value}><input type="radio" checked={flexiblePreference===value} onChange={()=>setFlexiblePreference(value)}/>{label}</label>)}</fieldset>}</>}
    {step===1&&<>{isSolo?<div className="mpi3Context"><strong>Solo ownership</strong><p>You own the complete project outcome, so no team role is required.</p></div>:<><p>Choose the role that best describes how you want to contribute. Team participation requires a primary role; Flexible participation may leave the role open if you genuinely have no preference.</p><label>Primary role {participation==='team'&&<span aria-hidden="true">*</span>}<select value={primaryRoleId} onChange={e=>setPrimaryRoleId(e.target.value)} required={participation==='team'}><option value="">{participation==='team'?'Select a role':'No role preference'}</option>{roles.map(role=><option key={role.id} value={role.id}>{role.title}</option>)}</select></label>{primaryRole&&primaryRole.description&&<p className="mpi3Hint">{primaryRole.description}</p>}<label>Secondary role <span>(optional)</span><select value={secondaryRoleId} onChange={e=>setSecondaryRoleId(e.target.value)}><option value="">No secondary role</option>{roles.filter(role=>role.id!==primaryRoleId).map(role=><option key={role.id} value={role.id}>{role.title}</option>)}</select></label>{secondaryRole&&secondaryRole.description&&<p className="mpi3Hint">{secondaryRole.description}</p>}<label>Role fit <span>(optional)</span><textarea value={roleFit} maxLength={1200} onChange={e=>setRoleFit(e.target.value)} placeholder="Briefly explain why this role fits your experience or the contribution you want to own."/></label></>}
      <fieldset><legend>Contribution areas <span>(optional)</span></legend><div className="mpi3Checks">{areas.map(area=><label className="mpi3Line" key={area}><input type="checkbox" checked={contributionAreas.includes(area)} onChange={()=>toggle(area)}/>{area}</label>)}</div></fieldset>{!isSolo&&<label className="mpi3Line"><input type="checkbox" checked={leadership} onChange={e=>setLeadership(e.target.checked)}/>I would be open to a leadership responsibility if selected.</label>}</>}
    {step===2&&<><p>Tell us what you can reliably support. The final commitment must be agreed before work begins.</p>{project.commitment&&<div className="mpi3Context"><small>Published commitment</small><strong>{project.commitment}</strong></div>}<fieldset><legend>Can you discuss and agree a realistic commitment? *</legend>{([['yes','Yes'],['yes_with_limitations','Yes, with limitations'],['no','No']] as [Commitment,string][]).map(([value,label])=><label className="mpi3Line" key={value}><input type="radio" checked={commitment===value} onChange={()=>setCommitment(value)}/>{label}</label>)}</fieldset><label>Expected availability <span>(optional)</span><input value={availability} maxLength={160} onChange={e=>setAvailability(e.target.value)} placeholder="e.g. evenings, 4 hours/week"/></label><label>Availability note <span>(optional)</span><textarea value={availabilityNote} maxLength={500} onChange={e=>setAvailabilityNote(e.target.value)}/></label>{!isSolo&&<label>Collaboration availability <span>(optional)</span><textarea value={collaborationAvailability} maxLength={500} onChange={e=>setCollaborationAvailability(e.target.value)}/></label>}</>}
    {step===3&&<><p>Give reviewers enough evidence to understand your motivation and the contribution you could own.</p><label>Why do you want to work on this project? *<textarea value={motivation} minLength={20} maxLength={2000} onChange={e=>setMotivation(e.target.value)}/><small>{motivation.trim().length}/2000 · minimum 20</small></label><label>Relevant skills <span>(comma separated)</span><textarea value={skills} maxLength={1000} onChange={e=>setSkills(e.target.value)}/></label><label>What would you contribute? *<textarea value={contribution} minLength={40} maxLength={2000} onChange={e=>setContribution(e.target.value)}/><small>{contribution.trim().length}/2000 · minimum 40</small></label><label>Relevant professional link <span>(optional)</span><input type="url" inputMode="url" value={portfolioUrl} onChange={e=>setPortfolioUrl(e.target.value)} placeholder="https://"/></label></>}
    {step===4&&<><p>Review your project interest before submitting.</p><dl className="mpi3Review"><div><dt>Project</dt><dd>{project.title}</dd></div><div><dt>Participation preference</dt><dd>{participation}{participation==='flexible'?` · ${flexiblePreference.replaceAll('_',' ')}`:''}</dd></div>{!isSolo&&<div><dt>Team formation</dt><dd>{teamPreference.replaceAll('_',' ')}</dd></div>}<div><dt>Primary role</dt><dd>{isSolo?'Solo — complete project ownership':primaryRole?.title||'No role preference'}</dd></div>{!isSolo&&secondaryRole&&<div><dt>Secondary role</dt><dd>{secondaryRole.title}</dd></div>}<div><dt>Contribution areas</dt><dd>{contributionAreas.join(', ')||'No preference selected'}</dd></div><div><dt>Commitment</dt><dd>{commitment.replaceAll('_',' ')}{availability?` · ${availability}`:''}</dd></div>{!isSolo&&roleFit&&<div><dt>Role fit</dt><dd>{roleFit}</dd></div>}{!isSolo&&<div><dt>Leadership interest</dt><dd>{leadership?'Open to discussing leadership':'Not selected'}</dd></div>}{availabilityNote&&<div><dt>Availability notes</dt><dd>{availabilityNote}</dd></div>}{!isSolo&&collaborationAvailability&&<div><dt>Collaboration availability</dt><dd>{collaborationAvailability}</dd></div>}<div><dt>Relevant skills</dt><dd>{csv(skills).join(', ')||'Not provided'}</dd></div><div><dt>Professional link</dt><dd>{portfolioUrl||'Not provided'}</dd></div><div><dt>Motivation</dt><dd>{motivation}</dd></div><div><dt>Expected contribution</dt><dd>{contribution}</dd></div></dl><section className="mpi3Terms"><h3>Project Participation Terms</h3><p>{PROJECT_PARTICIPATION_TERMS_SUMMARY}</p><button type="button" onClick={()=>dialog.current?.showModal()}>Read full participation terms</button><label className="mpi3Line"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/>I have read, understood and agree to the Mettelo Project Participation Terms.</label><dialog ref={dialog} onClick={e=>{if(e.target===e.currentTarget)e.currentTarget.close()}}><div className="mpi3Dialog"><div><h2>Project Participation Terms</h2><button type="button" aria-label="Close participation terms" onClick={()=>dialog.current?.close()}>×</button></div>{PROJECT_PARTICIPATION_TERMS_FULL.split('\n\n').slice(1).map((p,i)=><p key={i}>{p}</p>)}<button className="mpi3Button mpi3Primary" type="button" onClick={()=>dialog.current?.close()}>Done reading</button></div></dialog></section></>}
    <div className="mpi3Status" role="status" aria-live="polite">{message}</div><div className="mpi3Actions">{step>0&&<button className="mpi3Button" type="button" disabled={working} onClick={()=>go(step-1)}>Back</button>}{step<4?<button className="mpi3Button mpi3Primary" type="button" onClick={next}>Continue</button>:<button className="mpi3Button mpi3Primary" type="button" disabled={working} onClick={submit}>{working?'Submitting…':'Submit Interest'}</button>}</div>
  </section><style jsx global>{styles}</style></div>;
}

const styles=`
.mpi3Flow{width:min(100%,920px);margin:24px auto 80px;min-width:0}.mpi3Progress{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:0 0 18px}.mpi3Progress button{min-width:0;border:1px solid #d8dde3;background:#fff;border-radius:10px;padding:10px;text-align:left;color:#66707c}.mpi3Progress button.current{border-color:#2a2f52;color:#171b28}.mpi3Progress button:focus-visible,.mpi3Button:focus-visible,.mpi3Card input:focus-visible,.mpi3Card textarea:focus-visible,.mpi3Card select:focus-visible,.mpi3Card button:focus-visible{outline:3px solid currentColor;outline-offset:3px}.mpi3Progress small,.mpi3Progress strong{display:block;overflow-wrap:anywhere}.mpi3Progress small{font-size:10px}.mpi3Progress strong{font-size:12px;margin-top:3px}.mpi3Card{border:1px solid #d8dde3;border-radius:16px;background:#fff;padding:clamp(18px,4vw,34px);min-width:0}.mpi3Card h2{font-size:clamp(26px,4vw,34px);margin:0 0 10px}.mpi3Card p{line-height:1.65;color:#59636f}.mpi3Card fieldset{border:0;padding:0;margin:22px 0}.mpi3Card legend{font-weight:700;margin-bottom:10px}.mpi3Card label:not(.mpi3Line){display:grid;gap:7px;font-weight:700;margin:18px 0}.mpi3Card label span,.mpi3Card legend span{font-weight:400;color:#68727d}.mpi3Card input[type=text],.mpi3Card input[type=url],.mpi3Card input:not([type]),.mpi3Card textarea,.mpi3Card select{width:100%;box-sizing:border-box;border:1px solid #bcc5cf;border-radius:9px;padding:12px;font:inherit;background:#fff}.mpi3Card textarea{min-height:110px;resize:vertical}.mpi3Choices{display:grid;gap:10px}.mpi3Choices label{display:flex!important;align-items:flex-start;gap:12px;border:1px solid #d8dde3;border-radius:12px;padding:14px!important;margin:0!important;cursor:pointer}.mpi3Choices span{display:grid;gap:4px}.mpi3Choices small{font-weight:400;line-height:1.45;color:#68727d}.mpi3Line{display:flex!important;align-items:flex-start;gap:9px;margin:9px 0!important;font-weight:500!important}.mpi3Line input{margin-top:3px}.mpi3Checks{columns:2;column-gap:20px}.mpi3Context{padding:13px;border-left:3px solid #2a2f52;background:#f7f7f4;display:grid;gap:4px}.mpi3Context p{margin:0}.mpi3Hint{margin:-10px 0 12px;font-size:13px}.mpi3Review{display:grid;gap:1px;background:#e3e6ea;border:1px solid #e3e6ea;border-radius:10px;overflow:hidden}.mpi3Review div{background:#fff;padding:13px;min-width:0}.mpi3Review dt{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#68727d}.mpi3Review dd{margin:4px 0 0;overflow-wrap:anywhere}.mpi3Terms{margin-top:24px;padding-top:20px;border-top:1px solid #e2e5e8}.mpi3Terms h3{margin:0 0 8px}.mpi3Terms dialog{max-width:min(760px,calc(100vw - 32px));max-height:80vh;border:0;border-radius:14px;padding:0}.mpi3Terms dialog::backdrop{background:rgba(16,19,29,.56)}.mpi3Dialog{padding:24px;max-height:80vh;overflow:auto}.mpi3Dialog>div{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.mpi3Dialog h2{margin:0}.mpi3Dialog>div>button{font-size:26px;border:0;background:transparent}.mpi3Status{min-height:24px;margin:16px 0;color:#8b5a17}.mpi3Actions{display:flex;gap:10px;flex-wrap:wrap}.mpi3Button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border:1px solid #2a2f52;border-radius:9px;padding:10px 16px;background:#fff;color:#171b28;text-decoration:none;font-weight:700}.mpi3Primary{background:#2a2f52;color:#fff}.mpi3Success{width:min(100%,920px);margin:24px auto 80px;border:1px solid #d8dde3;border-radius:16px;background:#fff;padding:clamp(20px,4vw,36px)}.mpi3Success h2{margin:8px 0}.mpi3Eyebrow{font-size:11px;font-weight:800;letter-spacing:.1em;color:#8b5a17}@media(max-width:720px){.mpi3Progress{grid-template-columns:1fr}.mpi3Progress button:not(.current){display:none}.mpi3Checks{columns:1}.mpi3Card{border-radius:12px}.mpi3Actions{display:grid;grid-template-columns:1fr}.mpi3Button{width:100%}}@media(max-width:360px){.mpi3Flow{margin-top:14px}.mpi3Card{padding:16px}.mpi3Card h2{font-size:25px}}
`;