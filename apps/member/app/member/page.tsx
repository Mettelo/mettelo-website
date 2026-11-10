import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {websiteProject} from '@/lib/project-catalogue';
import {completionColumns,profileCompletion} from '@/lib/profile-completion.mjs';
import {memberHome} from '@/lib/member-home.mjs';
import {memberHomePreview,exampleProgressWorkspaces} from '@/lib/member-home-preview';
import {progressCards,memberProgress} from '@/lib/member-progress.mjs';
import type {LabCard} from '@/lib/lab';
import styles from './member-home.module.css';
import HomeCommunity from './HomeCommunity';
import {Suspense} from 'react';
export const dynamic='force-dynamic';

function ProgressIcon({kind}:{kind:string}){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{kind==='active'?<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 18h7m-3.5-3.5v7"/></>:kind==='approved'?<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>:kind==='completed'?<><path d="M8 3h8v5a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v6m-4 3h8m-4-3-3 3m3-3 3 3"/></>:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6m-6 4h3"/></>}</svg>}

function HomeMark(){return <svg viewBox="0 0 200 180" fill="none" aria-hidden="true"><rect x="37" y="19" width="126" height="142" rx="25" stroke="currentColor" strokeOpacity=".13"/><path d="M37 60H18M163 120h19M100 19V3M100 161v16" stroke="currentColor" strokeOpacity=".2" strokeWidth="2"/><rect x="58" y="42" width="36" height="36" rx="9" fill="currentColor" fillOpacity=".09"/><rect x="106" y="42" width="36" height="36" rx="9" fill="#B38A45" fillOpacity=".28"/><rect x="58" y="90" width="36" height="36" rx="9" fill="#B38A45" fillOpacity=".5"/><path d="M111 121l25-25m-25 0h25v25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="163" cy="19" r="5" fill="#B38A45"/></svg>}

export default async function MemberHomePage({searchParams}:{searchParams:Promise<{profile?:string;preview?:string}>}){
 const params=await searchParams,db=await createServerSupabaseClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/signin?next=%2Fmember');
 if(!user.email_confirmed_at)redirect('/auth/check-email');
 const {data,error}=await db.from('profiles').select('username,'+completionColumns).eq('id',user.id).single();
 if(error||!data)throw new Error('Your member identity could not be loaded. Please try again.');
 const profile=data as unknown as Record<string,unknown>;
 if(!profile.username)redirect('/onboarding');
 const [interests,lab]=await Promise.all([
  db.from('website_project_interests').select('id,project_ref,primary_role,submitted_at',{count:'exact'}).eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(3),
  db.rpc('website_lab',{p_action:'mine'})
 ]);
 const example=process.env.NODE_ENV==='development'?memberHomePreview(params.preview):null;
 const input=example||{cards:Array.isArray(lab.data)?lab.data as LabCard[]:[],applications:interests.data||[],applicationCount:interests.count??0,profilePercent:profileCompletion(profile).percent,labFailed:Boolean(lab.error)||!Array.isArray(lab.data),applicationsFailed:Boolean(interests.error)};
 const recognition=example?{data:params.preview==='progress'?{milestones:4,milestones_month:2,delivered:1,skills:3}:{milestones:0,milestones_month:0,delivered:0,skills:0},error:input.labFailed}:await db.rpc('website_member_home',{p_action:'progress'});
 const workspaces=example?exampleProgressWorkspaces(input.cards):recognition.error?[]:progressCards(input.cards).map(card=>({team_id:card.team_id,items:recognition.data?.next?.team_id===card.team_id?[recognition.data.next]:[]}));
 const progress=memberProgress({cards:input.cards,workspaces,userId:example?'example-member':user.id,labFailed:input.labFailed});
 const home=memberHome({...input,progress}),{primary}=home;
 const value=(key:string):number|null=>!recognition.error&&Number.isSafeInteger(recognition.data?.[key])&&recognition.data[key]>=0?recognition.data[key]:null;
 const metrics=[
  {label:'Active projects',value:progress.activeProjects,note:progress.activeProjects?'Keep building with your team':'Your first project starts here',icon:'active'},
  {label:'Milestones completed',value:value('milestones'),note:value('milestones_month')?`${value('milestones_month')} accepted this month`:'Your owned outcomes, accepted',icon:'approved'},
  {label:'Projects delivered',value:value('delivered'),note:value('delivered')?'Built with your teams':'Finished work with delivery evidence',icon:'completed'},
  {label:'Skills practised',value:value('skills'),note:value('skills')?'Linked to your contribution evidence':'Grow through practical project work',icon:'proof'}
 ];
 const website=publicWebsiteOrigin();
 const firstName=String(profile.full_name||'Member').trim().split(/\s+/)[0]||'Member';
 const href=primary.href==='projects'?website+'/projects/':primary.href;
 const recent=primary.kind==='applied'?input.applications[0]:null;
 const deadline=primary.kind==='offer'&&primary.project?.offer_expires_at?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}).format(new Date(primary.project.offer_expires_at)):null;
 return <section className={styles.home} aria-labelledby="member-home-title">
  <div className={styles.inner}>
   {example&&<aside className={styles.example} aria-label="Example home state"><span>Example state · actions disabled · your records are unchanged</span><a href="/member">Return to your real home →</a></aside>}
   <header className={styles.welcome}><p className={styles.eyebrow}>YOUR METTELO SPACE</p><h1 id="member-home-title">Good to see you, {firstName}<span>.</span></h1><p>Every step you build adds to your experience.</p></header>
   {params.profile==='saved'&&!example&&<p className={styles.notice} role="status">Your profile has been saved.</p>}
   <section className={styles.focus} data-state={primary.kind} aria-labelledby="home-next-title" role={primary.kind==='unavailable'?'status':undefined}>
    <header className={styles.focusTop}><span className={styles.eyebrow}>YOUR NEXT STEP</span><span className={styles.badge}>{primary.badge}</span></header>
    <div className={styles.focusBody}><div className={styles.copy}>
     <h2 id="home-next-title">{primary.title}</h2>
     {primary.project&&(primary.kind!=='active'||primary.title!==primary.project.title)&&<p className={styles.projectName}>{primary.project.title}</p>}
     {recent&&<p className={styles.projectName}>{websiteProject(recent.project_ref)?.name||recent.project_ref}</p>}
     <p className={styles.description}>{primary.description}</p>
     {primary.project&&<div className={styles.projectMeta}>{primary.project.role&&<span>{primary.project.role}</span>}{primary.project.label&&primary.project.participation!=='solo'&&<span>{primary.project.label}</span>}{primary.project.participation==='solo'&&<span>Solo project</span>}</div>}
     {deadline&&<p className={styles.deadline}>Respond by {deadline}</p>}
     {primary.kind==='profile'&&<div className={styles.profileProgress}><div><span>Saved profile</span><strong>{home.profilePercent}%</strong></div><progress value={home.profilePercent} max={100} aria-label="Saved profile completion"/><small>80% is needed to apply. A profile photo is optional.</small></div>}
     {example?<button className={styles.primary} disabled>{primary.label}<span aria-hidden="true">↗</span></button>:<a className={styles.primary} href={href}>{primary.label}<span aria-hidden="true">↗</span></a>}
    </div><div className={styles.mark}><HomeMark/></div></div>
   </section>
   <section className={styles.progressSection} aria-labelledby="home-progress-title"><header className={styles.progressHeading}><h2 id="home-progress-title">Your work, taking shape.</h2><p>From your accessible Mettelo Labs</p></header><div className={styles.metricGrid}>{metrics.map(metric=><article className={styles.metric} key={metric.icon}><div className={styles.metricTop}><h3>{metric.label}</h3><span className={styles.metricIcon} aria-hidden="true"><ProgressIcon kind={metric.icon}/></span></div><strong className={styles.metricValue}>{metric.value===null?<><span aria-hidden="true">—</span><span className={styles.srOnly}>Unavailable</span></>:metric.value}</strong><p>{metric.value===null?'Could not load · try your Lab':metric.note}</p></article>)}</div>{(progress.unavailable||recognition.error)&&<p className={styles.progressNotice} role="status">Some progress could not load. Your work is unchanged. <a href="/member">Try again</a>.</p>}<details className={styles.metricExplanation}><summary>What these numbers recognise</summary><p>Active projects count distinct briefs in your admitted active Labs. Milestones count outcomes you own with recorded coordinator acceptance and evidence. Delivered projects need a completed Lab and confirmed delivery evidence. Skills are distinct skills you record against your own contributions; they describe practice, not certified proficiency. Counts cover your currently accessible Labs.</p></details></section>
   <nav className={styles.facts} aria-label="Your applications and placements">{example?<span>Applications · {input.applicationCount} submitted</span>:<a href="/member/applications">{input.applicationsFailed?'Applications · Try again':`Applications · ${input.applicationCount} submitted`}<span aria-hidden="true">↗</span></a>}<a href="/member/lab">Your project journeys <span aria-hidden="true">↗</span></a><a href="/member/portfolio">My Portfolio <span aria-hidden="true">↗</span></a></nav>
   {home.supporting.length>0&&<section className={styles.supporting} aria-labelledby="home-also-title"><h2 id="home-also-title">Also in your space</h2>{home.supporting.map(row=>{const title=websiteProject(row.title)?.name||row.title;return example?<div className={styles.supportRow} key={row.href}><span><strong>{title}</strong><small>{row.detail}</small></span><span aria-hidden="true">↗</span></div>:<a className={styles.supportRow} href={row.href} key={row.href}><span><strong>{title}</strong><small>{row.detail}</small></span><span aria-hidden="true">↗</span></a>;})}</section>}
   {!example&&<Suspense fallback={null}><HomeCommunity db={db}/></Suspense>}
   <div className={styles.secondary}>
   <aside className={styles.profileCard} aria-labelledby="home-profile-title">
    {primary.kind==='profile'?<>
     <p className={styles.eyebrow}>THE PROJECT JOURNEY</p><h2 id="home-profile-title">Small steps.<br/>{' '}Practical experience.</h2>
     <ol className={styles.journey}><li><strong>Find your fit</strong><span>Choose a project and a role that interests you.</span></li><li><strong>Express your interest</strong><span>Apply with your member profile.</span></li><li><strong>Build in the Lab</strong><span>If offered a place, review it and join your workspace.</span></li></ol>
    </>:<>
     <div className={styles.profileTop}><span className={styles.monogram} aria-hidden="true">{firstName.charAt(0).toUpperCase()}</span><span className={styles.eyebrow}>YOUR PROFILE</span></div>
     <h2 id="home-profile-title">Make your experience count.</h2><p>Your skills and interests help explain what you can bring to a project.</p>
     <div className={styles.profileProgress}><div><span>Profile completion</span><strong>{home.profilePercent}%</strong></div><progress value={home.profilePercent} max={100} aria-label="Profile completion"/><small>{home.profilePercent>=80?'You meet the 80% profile requirement to apply.':'Reach 80% when you’re ready to apply.'} A photo is optional.</small></div>
     {example?<button className={styles.textAction} disabled>Review your profile <span aria-hidden="true">↗</span></button>:<a className={styles.textAction} href="/member/profile">Review your profile <span aria-hidden="true">↗</span></a>}
    </>}
   </aside>
   <section className={styles.opportunityCard} aria-labelledby="home-opportunities-title"><span className={styles.opportunityIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c5 3 13 3 18 0M12 12v4"/></svg></span><div><p className={styles.eyebrow}>LOOKING AHEAD</p><h2 id="home-opportunities-title">Find your next opportunity.</h2><p>Explore career roles alongside your practical project experience.</p></div><a className={styles.textAction} href="/opportunities">Explore opportunities <span aria-hidden="true">↗</span></a></section>
   </div>
   <footer className={styles.footer}><span>Your space to learn, build and move forward.</span><a href="/member/enquiries">Need a hand? Get support <span aria-hidden="true">↗</span></a></footer>
  </div>
 </section>;
}
