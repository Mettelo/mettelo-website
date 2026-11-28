import type {ReactNode} from 'react';
import AppIcon from '@/components/AppIcon';
import {websiteProject} from '@/lib/project-catalogue';
import {progressCards} from '@/lib/member-progress.mjs';
import type {memberHome} from '@/lib/member-home.mjs';
import type {LabCard} from '@/lib/lab';
import styles from './member-home.module.css';

type Application={project_ref:string;submitted_at?:string};
export type HomeMetric={label:string;value:number|null};
type Props={home:ReturnType<typeof memberHome>;cards:LabCard[];applications:Application[];applicationCount:number;applicationsFailed:boolean;labFailed:boolean;metrics:HomeMetric[];progressUnavailable:boolean;firstName:string;website:string;example?:boolean;profileSaved?:boolean;community?:ReactNode};
const projectTitle=(reference:string)=>websiteProject(reference)?.name||reference;
function dateLabel(value?:string|null){const date=value?new Date(value):null;return date&&Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}).format(date):null;}

export default function HomeDashboard({home,cards,applications,applicationCount,applicationsFailed,labFailed,metrics,progressUnavailable,firstName,website,example=false,profileSaved=false,community}:Props){
 const {primary}=home;
 const Action=({href,children,className=styles.textAction}:{href:string;children:ReactNode;className?:string})=>example?<button className={className} disabled>{children}</button>:<a className={className} href={href}>{children}</a>;
 const accessible=labFailed?[]:progressCards(cards);
 const active=accessible.filter(card=>card.team_status==='active');
 const completed=accessible.filter(card=>card.team_status==='completed');
 const confirmedRefs=new Set(cards.filter(card=>card.membership_status==='confirmed').map(card=>card.project_ref));
 const unplaced=applicationsFailed?[]:applications.filter(application=>!confirmedRefs.has(application.project_ref));
 const recent=primary.kind==='applied'?(unplaced[0]||applications[0]):null;
 const otherApplications=unplaced.filter(application=>application!==recent).slice(0,3);
 const recorded=metrics.filter(metric=>metric.value!==null&&metric.value>0);
 const progressFailed=progressUnavailable||metrics.some(metric=>metric.value===null);
 const discovery=['profile','explore'].includes(primary.kind);
 const deadline=primary.kind==='offer'?dateLabel(primary.project?.offer_expires_at):null;
 const primaryHref=primary.kind==='active'&&primary.project?'/member/lab/'+primary.project.team_id+'?view=home':recent?'/member/projects/'+encodeURIComponent(recent.project_ref)+'/interest':primary.href==='projects'?website+'/projects/':primary.href;
 const context=labFailed?'Project information unavailable':active.length?`${active.length} active ${active.length===1?'Lab':'Labs'}`:primary.kind==='profile'?'Getting started':primary.kind==='explore'?'Profile requirement met':primary.badge;
 const labRows=primary.kind==='completed'?completed:active.filter(card=>primary.kind!=='active'||card.team_id!==primary.project?.team_id);
 const hasProgress=recorded.length>0||progressFailed;
 const discoveryItems=[{icon:'grid',title:'Explore projects',description:'Find a challenge and a role that interests you.',label:'Browse briefs',href:website+'/projects/'},{icon:'people',title:'Meet people in Connect',description:'Read, ask questions and find collaborators.',label:'Open Connect',href:'/member/market'},{icon:'book',title:'Learn from a workshop',description:'Find practical sessions and resources.',label:'View resources',href:'/resources'}].filter(item=>item.href!==primaryHref);
 return <section className={styles.home} aria-labelledby="member-home-title"><div className={styles.inner}>
  {example&&<aside className={styles.example}><span>Example state · actions disabled · your records are unchanged</span><a href="/member">Return to your real home</a></aside>}
  <header className={styles.welcome}><span className={styles.context}>{context}</span><h1 id="member-home-title">{primary.kind==='profile'?'Welcome':'Welcome back'}, {firstName}</h1><p>{discovery?'Start with a project, a conversation or a learning resource.':'Your current work and next steps.'}</p></header>
  {profileSaved&&<p className={styles.notice} role="status">Your profile has been saved.</p>}
  <div className={styles.layout}><div className={styles.mainColumn}>
   <section className={styles.focus} data-state={primary.kind} aria-labelledby="home-next-title" role={primary.kind==='unavailable'?'status':undefined}>
    <header className={styles.focusTop}><span className={styles.focusLabel}><span className={styles.focusIcon}><AppIcon name={primary.kind==='active'?'tasks':primary.kind==='profile'?'person':primary.kind==='offer'?'mail':'compass'} size={18}/></span><span className={styles.eyebrow}>Your next step</span></span><span className={styles.badge}>{primary.badge}</span></header>
    <h2 id="home-next-title">{primary.title}</h2>
    {primary.project&&primary.title!==primary.project.title&&<p className={styles.projectName}>{primary.project.title}</p>}
    {recent&&<p className={styles.projectName}>{projectTitle(recent.project_ref)}</p>}
    <p className={styles.description}>{primary.description}</p>
    {deadline&&<p className={styles.deadline}>Respond by {deadline}</p>}
    {recent&&dateLabel(recent.submitted_at)&&<p className={styles.projectMeta}>Submitted {dateLabel(recent.submitted_at)}</p>}
    {primary.kind==='profile'&&<ProfileProgress percent={home.profilePercent}/>}
    <div className={styles.focusFooter}>{primary.project&&<p className={styles.projectMeta}>{[primary.project.role,primary.project.participation==='solo'?'Solo project':primary.project.label].filter(Boolean).join(' · ')}</p>}<div className={styles.focusActions}><Action href={primaryHref} className={styles.primary}>{primary.kind==='active'?'Enter Lab':primary.label}<AppIcon name="forward" size={18}/></Action>{primary.kind==='active'&&primary.href.includes('?view=')&&<Action href={primary.href}>{primary.label}<AppIcon name="forward" size={16}/></Action>}</div></div>
   </section>

   {discovery?<section aria-labelledby="home-discover-title"><header className={styles.sectionHeading}><h2 id="home-discover-title">Choose where to start</h2></header><div className={styles.discovery}>
    {discoveryItems.map(item=><article className={styles.discoveryRow} key={item.href}><AppIcon name={item.icon}/><div><h3>{item.title}</h3><p>{item.description}</p></div><Action href={item.href} className={styles.rowAction}>{item.label}<AppIcon name="forward" size={16}/></Action></article>)}
   </div></section>:<>
    {labRows.length>0&&<section className={styles.panel} aria-labelledby="home-labs-title"><header className={styles.sectionHeading}><h2 id="home-labs-title">{primary.kind==='completed'?'Your completed Labs':primary.kind==='active'?'Other Labs':'Your Labs'}<span className={styles.sectionCount}>{labRows.length}</span></h2>{primaryHref!=='/member/lab'&&<Action href="/member/lab">View all<AppIcon name="forward" size={16}/></Action>}</header><div>{labRows.slice(0,3).map(card=><article className={`${styles.activityRow} ${styles.labActivity}`} key={card.team_id}><span className={styles.labMark}><AppIcon name={card.participation==='solo'?'person':'layers'} size={20}/></span><div><span className={styles.labReference}>{card.project_ref}</span><h3>{card.title}</h3><p>{[card.role,card.team_status==='completed'?'Completed · read-only':card.participation==='solo'?'Active Solo Lab':'Active team Lab'].filter(Boolean).join(' · ')}</p></div><Action href={'/member/lab/'+card.team_id} className={styles.rowAction}>{card.team_status==='completed'?'View Lab':'Enter Lab'}<AppIcon name="forward" size={16}/></Action></article>)}</div></section>}
    {(otherApplications.length>0||(applicationsFailed&&primaryHref!=='/member/applications'))&&<section className={styles.panel} aria-labelledby="home-applications-title"><header className={styles.sectionHeading}><h2 id="home-applications-title">{otherApplications.length?'Other applications':'Applications'}</h2>{!applicationsFailed&&primaryHref!=='/member/applications'&&<Action href="/member/applications">View all</Action>}</header>{applicationsFailed?<p className={styles.status} role="status">Applications could not load. <Action href="/member/applications">Try again</Action></p>:otherApplications.map(application=><article className={styles.activityRow} key={application.project_ref}><div><h3>{projectTitle(application.project_ref)}</h3><p>Submitted{dateLabel(application.submitted_at)?' · '+dateLabel(application.submitted_at):''}</p></div><Action href={'/member/projects/'+encodeURIComponent(application.project_ref)+'/interest'} className={styles.rowAction}>View application<AppIcon name="forward" size={16}/></Action></article>)}</section>}
    {primary.kind==='completed'&&<Action href={website+'/projects/'} className={styles.rowAction}>Explore another project<AppIcon name="forward" size={18}/></Action>}
   </>}

   {hasProgress&&<section aria-labelledby="home-progress-title"><header className={styles.sectionHeading}><h2 id="home-progress-title">Recorded progress</h2>{primaryHref!=='/member/portfolio'&&<Action href="/member/portfolio">View Portfolio<AppIcon name="forward" size={16}/></Action>}</header>{recorded.length>0&&<div className={styles.metricGrid} data-count={recorded.length}>{recorded.map(metric=><article className={styles.metric} key={metric.label}><strong>{metric.value}</strong><h3>{metric.label}</h3></article>)}</div>}{progressFailed&&<p className={styles.status} role="status">Some progress could not load. Your work is unchanged. <Action href="/member">Try again</Action></p>}{recorded.length>0&&<details className={styles.metricExplanation}><summary>What these numbers recognise</summary><p>Counts cover your currently accessible active and completed Labs. Active projects count distinct briefs. Milestones count outcomes you own with recorded acceptance. Delivered projects need a completed Lab and confirmed team delivery. Skills are recorded against your contributions, not taken from your profile; they are not independently verified qualifications. Zero counts are omitted here.</p></details>}</section>}
   {community}
  </div><aside className={styles.rail} aria-label="Supporting tools">
   {primary.kind==='profile'&&<section className={styles.panel}><h2>Before your first Lab</h2><ol className={styles.journey}><li><strong>Explore a brief</strong><span>Check the problem, roles and working arrangement.</span></li><li><strong>Apply with your profile</strong><span>Reach 80% saved completion when you’re ready to apply.</span></li><li><strong>Follow your placement</strong><span>If approved, complete the preparation steps in Mettelo Lab.</span></li></ol></section>}
   {!discovery&&home.profilePercent<80&&<section className={styles.panel}><h2>Your saved profile</h2><p className={styles.muted}>Reach 80% when you want to apply for another project.</p><ProfileProgress percent={home.profilePercent}/><Action href="/member/profile">Review your profile</Action></section>}
   {discovery?<section className={styles.panel}><h2>Looking for a role?</h2><p className={styles.muted}>Explore external roles alongside your project journey.</p><Action href="/opportunities">Explore roles<AppIcon name="external" size={16}/></Action></section>:<section className={styles.panel}><h2>Explore next</h2><div className={styles.tools}>{[{icon:'file',label:'My Portfolio',detail:'Your recorded contributions',href:'/member/portfolio'},{icon:'book',label:'Learning resources',detail:'Workshops and career materials',href:'/resources'},{icon:'briefcase',label:'Explore roles',detail:'Apply on the employer’s website',href:'/opportunities'}].filter(item=>item.href!==primaryHref&&(item.href!=='/member/portfolio'||!hasProgress)).map(item=><Action href={item.href} className={styles.toolLink} key={item.href}><AppIcon name={item.icon} size={18}/><span><strong>{item.label}</strong><small>{item.detail}</small></span><AppIcon name="forward" size={16}/></Action>)}</div></section>}
  </aside></div>
  {!applicationsFailed&&applicationCount>0&&primary.kind!=='applied'&&primaryHref!=='/member/applications'&&otherApplications.length===0&&<footer className={styles.footer}><Action href="/member/applications">Application history · {applicationCount} submitted</Action></footer>}
 </div></section>;
}

function ProfileProgress({percent}:{percent:number}){return <div className={styles.profileProgress}><div><span>Saved profile</span><strong>{percent}%</strong></div><progress value={percent} max={100} aria-label="Saved profile completion"/><small>80% is needed to apply. A profile photo is optional.</small></div>;}

export function HomeDashboardSkeleton(){return <section className={styles.home} aria-busy="true" aria-label="Member home loading"><div className={styles.inner}><header className={styles.welcome}><h1>Member home</h1><p role="status">Loading your current work and next steps…</p></header><div className={styles.layout} aria-hidden="true"><div className={styles.mainColumn}><div className={styles.loadingFocus}/><div className={styles.loadingPanel}/></div><div className={styles.loadingPanel}/></div></div></section>;}
