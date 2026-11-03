'use client';

import {profileCompletion} from '@/lib/profile-completion.mjs';
import {useEffect,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {profileFields,validateProfilePatch,fillEmptyProfile} from '@/lib/profile-contract.mjs';

const matchingKeys=['skills','technical_interests','preferred_roles','weekly_availability','problem_interests','community_contribution'];
const profileHints:Record<string,string>={skills:'Separate skills and tools with commas, for example SQL, Power BI, Python.',technical_interests:'For example, analytics, AI, cloud or data engineering. Include areas you want to learn.',preferred_roles:'For example, analyst, designer, tester, project coordinator or mentor.',weekly_availability:'An estimate, not a commitment. Agree your actual availability with your project team.',problem_interests:'For example, healthcare, finance, education, climate or public services.',community_contribution:'Tell us what you could bring: practical work, peer reviews, mentoring, documentation or organising.',headline:'A short description of your focus, such as Data analyst building skills in Power BI.',location:'For example, Lagos, Nigeria or Manchester, UK.',bio:'Share your interests, strengths and the kind of work you would like to contribute to.',primary_goal:'For example, build a portfolio, collaborate on a project or develop a new skill.',linkedin_url:'Use the full HTTPS link. One professional link counts towards completion.',github_url:'Use your full HTTPS profile link. Your GitHub username can differ from Mettelo.',portfolio_url:'Use the full HTTPS link to your portfolio or published work.'};
const groupDescriptions:Record<string,string>={'Project interests and contribution':'Help us understand the work you want to contribute to. These matching details do not change your completion percentage.','About you':'Start with how you would introduce yourself to a collaborator.','Your work and goals':'Tell us where you are now and what you want to work towards.','Professional links':'Add the work you want to share. These links and your photo are optional.'};
const profileGroups:{title:string;keys:string[]}[]=[
 {title:'About you',keys:['full_name','headline','location','bio']},
 {title:'Your work and goals',keys:['professional_area','current_job_title','organisation','experience_level','primary_goal']},
 {title:'Project interests and contribution',keys:matchingKeys},
 {title:'Professional links',keys:['linkedin_url','github_url','portfolio_url']}
];
type Props={returnTo?:string;profile:Record<string,unknown>;prefill:{state:string;draft?:Record<string,string>}};
export default function MemberProfileForm({profile,prefill,returnTo}:Props){
  const router=useRouter();
  const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(profileFields.map(field=>[field.key,String(profile[field.key]||'')])));
  const [usePrefill,setUsePrefill]=useState(false);
  const dirty=profileFields.some(field=>values[field.key]!==String(profile[field.key]||''));
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const [status,setStatus]=useState<'idle'|'saving'|'error'|'stale'|'success'>('idle');
  const [message,setMessage]=useState('');
  function updateValue(key:string,value:string){setValues(current=>({...current,[key]:value}));if(status==='success'){setStatus('idle');setMessage('');}}
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(status==='saving')return;
    setStatus('saving');setMessage('');
    try{
      const patch=validateProfilePatch(values);
      const response=await fetch('/api/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({patch,expected_version:profile.profile_version,use_prefill:usePrefill})});
      const result=await response.json();
      if(!response.ok){setStatus(response.status===409?'stale':'error');setMessage(result.error||'Your profile could not be saved.');return;}
      setStatus('success');setMessage('Your private profile has been saved.');
      if(result.profile)setValues(Object.fromEntries(profileFields.map(field=>[field.key,String(result.profile[field.key]||'')])));
      if(returnTo)router.push(returnTo);router.refresh();
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Your profile could not be saved. Your edits are still here.');}
  }
  const completion=profileCompletion({...values,avatar_path:profile.avatar_path});
  return <form className="formCard profileForm" onSubmit={save} aria-busy={status==='saving'}>
    <section className="profileCompletion" aria-labelledby="completion-title"><h2 id="completion-title">Your profile draft · {completion.percent}%</h2><progress value={completion.percent} max={100} aria-label="Profile completion draft"/><p>{completion.eligible?(dirty?'Your draft meets the 80% requirement. Save your profile before submitting project interest.':'Your saved profile meets the 80% requirement for project interest.'):'Complete any eight of ten items and save to submit project interest.'}</p><details><summary>See the ten profile items</summary><ul>{completion.items.map(item=><li key={String(item.key)}>{item.complete?'Complete':'Missing'}: {item.label} (10%)</li>)}</ul></details><p className="tinyNote">{dirty?'This preview includes unsaved edits. Only saved information counts towards project interest.':'Based on your saved profile. Changes appear here as you edit.'}</p></section><div className="profileIdentity"><strong>@{String(profile.username||'')}</strong><span>Member ID: {String(profile.member_id||'')}</span></div>
    <p className="profilePrivacyNote">Your details are private. Save with your name and complete the rest at your own pace. Fields marked Profile readiness count towards the 80% needed to submit project interest. Completing the eight core items is enough; photo and links remain optional.</p>
    {prefill.state==='available'&&!usePrefill&&<div className="prefillNotice"><h2>Review your community registration</h2><p>You can bring registration details into empty fields, then edit them before saving. Your existing details will stay in place.</p><button className="button ghost" type="button" onClick={()=>{setValues(current=>fillEmptyProfile(current,prefill.draft||{}));setUsePrefill(true);}}>Use registration details</button></div>}
    {usePrefill&&<p role="status">Registration details added to this draft. Review the fields before saving.</p>}
    {prefill.state==='review_required'&&<p className="prefillNotice">Your earlier registration needs review. You can complete your profile here while we resolve it.</p>}
    <nav className="profileSectionLinks" aria-label="Profile sections">{profileGroups.map(({title},index)=><a key={title} href={`#profile-section-${index}`}>{title}</a>)}</nav>
    {profileGroups.map(({title,keys},index)=><fieldset id={`profile-section-${index}`} key={title} disabled={status==='saving'}><legend>{title}</legend><p className="profileGroupIntro">{groupDescriptions[title]}</p><div className="profileGrid">{profileFields.filter(field=>keys.includes(field.key)).map(field=><div key={field.key} className={field.multiline?'profileWide':''}>
      <label htmlFor={field.key}>{field.label}{field.required?' *':matchingKeys.includes(field.key)?'':['organisation','linkedin_url','github_url','portfolio_url'].includes(field.key)?' (optional)':' · Profile readiness'}</label>
      {field.options?<select aria-describedby={profileHints[field.key]?`${field.key}-hint`:undefined} id={field.key} value={values[field.key]} onChange={e=>updateValue(field.key,e.target.value)}><option value="">Choose an option</option>{field.options.map(option=><option key={option} value={option}>{{entry:'Entry level',mid:'Mid level',senior:'Senior',lead:'Lead',executive:'Executive'}[option]||option.replaceAll('_',' ')}</option>)}</select>
        :field.multiline?<textarea aria-describedby={profileHints[field.key]?`${field.key}-hint`:undefined} id={field.key} rows={5} maxLength={field.max} value={values[field.key]} onChange={e=>updateValue(field.key,e.target.value)}/>
        :<input aria-describedby={profileHints[field.key]?`${field.key}-hint`:undefined} id={field.key} type={field.url?'url':'text'} required={field.required} maxLength={field.max} value={values[field.key]} autoComplete={field.key==='full_name'?'name':field.key==='organisation'?'organization':field.key==='current_job_title'?'organization-title':'off'} onChange={e=>updateValue(field.key,e.target.value)}/>}
    {profileHints[field.key]&&<p className="profileFieldHint" id={`${field.key}-hint`}>{profileHints[field.key]}</p>}</div>)}</div></fieldset>)}
    <div role="status" aria-live="polite" className={`formStatus ${status==='error'||status==='stale'?'error':''}`}>{message}</div>
    {status==='stale'&&<p>Copy any edits you want to keep before reloading. <button type="button" className="button ghost" onClick={()=>window.location.reload()}>Reload profile</button></p>}
    <div className="profileSaveBar"><div className="actions"><button className="button dark" disabled={status==='saving'||status==='stale'}>{status==='saving'?'Saving…':'Save private profile'}</button><a className="button ghost" href="/member">Back to My Mettelo</a></div><p className="tinyNote">{dirty?'You have unsaved changes.':'Your profile matches the last loaded version.'} Select Save private profile to save your details.</p></div>
  </form>;
}
