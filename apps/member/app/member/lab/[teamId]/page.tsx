import Link from 'next/link';
import {headerAccount} from '@/lib/header-account';
import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import {labReadOnlyMessage} from '@/lib/placement-journey.mjs';
import LabRecognition from '@/components/lab/LabRecognition';
import LabSupport from '@/components/lab/LabSupport';
import LabMeetings from '@/components/lab/LabMeetings';
import {Suspense} from 'react';
import {notFound,redirect} from 'next/navigation';
import {labSession,labRpc,type LabTeam} from '@/lib/lab';
import {resolveWebsiteProject} from '@/lib/market-proposals';
import guides from '@/lib/project-source-guidance.snapshot.json';
import MetteloLabNavigation from '@/components/lab/MetteloLabNavigation';
import LabTasks from '@/components/lab/LabTasks';
import LabPlan from '@/components/lab/LabPlan';
import LabHome from '@/components/lab/LabHome';
import LabEvidence from '@/components/lab/LabEvidence';
import LabLinks from '@/components/lab/LabLinks';
import type {WorkspaceItem} from '@/lib/lab-workspace';
import '@/components/lab/workspace-experience.css';
import ProjectMessagePanel from '@/components/lab/ProjectMessagePanel';
import LabTeamRoster from '@/components/lab/LabTeamRoster';
import type {ChatMessage} from '@/lib/lab-chat';
import chatMessageStyles from '@/components/lab/chat-message.module.css';
import chatComposerStyles from '@/components/lab/chat-composer.module.css';
import '@/components/lab/messages.css';
import styles from '@/components/lab/workspace.module.css';
import '../lab.css';
export const dynamic='force-dynamic';
type Item=WorkspaceItem;
type Snapshot={team:LabTeam;current_user_id:string;can_lead:boolean;members:{id:string;name:string;role:string;username?:string|null;headline?:string|null}[]|null;items:Item[]};
export default async function Page({params,searchParams}:{params:Promise<{teamId:string}>;searchParams:Promise<{view?:string;filter?:string;notice?:string;error?:string}>}){
 const {teamId}=await params;const q=await searchParams;if(!/^[0-9a-f-]{36}$/i.test(teamId))notFound();
 const destination=new URLSearchParams();if(q.view)destination.set('view',q.view);if(q.filter)destination.set('filter',q.filter);
 const {db,user}=await labSession();if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/lab/${teamId}${destination.size?'?'+destination.toString():''}`)}`);
 let data:Snapshot;try{data=await labRpc(db,'workspace',{team_id:teamId}) as Snapshot;}catch{notFound();}
 const team=data.team;const project=await resolveWebsiteProject(db,team.project_ref);const account=q.view==='team'?await headerAccount():null;const members=(data.members||[]).map(member=>({...member,avatarUrl:member.id===user.id?account?.avatar||null:null}));const guide=guides.find(g=>g.project_ref===team.project_ref);
 const recognition=q.view==='proof'?await db.rpc('website_member_home',{p_action:'recognition',p_payload:{team_id:teamId}}):null;
 const view=['home','plan','tasks','chat','data','proof','resources','team','events','support'].includes(q.view||'')?q.view!:'home';
 const writable=team.status==='active';const writeAvailability=team.status==='forming'?'Your placement is accepted, but this Lab is still being prepared. Booking meetings and recording contributions become available when the readiness checks are complete.':team.status==='paused'?'This Lab is paused. New meetings and contributions are unavailable until work resumes.':'This completed Lab is read-only. You can revisit meetings and recorded contributions.';const canPlan=data.can_lead&&(writable||team.status==='forming');
 const items=(kind:string)=>data.items.filter(i=>i.kind===kind);const tasks=items('task');
 const initialChat:ChatMessage[]=view==='chat'?(await labRpc(db,'chat_snapshot',{team_id:teamId,project_ref:team.project_ref})).items:[];
 const chatTeam=members.map(m=>({...m,headline:m.headline||null}));
 return <div className={`${styles.workspace} websiteLabWorkspace`} data-website-lab><a className={styles.skipLink} href="#mettelo-lab-content">Skip to Lab content</a><div className={`${styles.shell} ${styles.focusedShell}`}>
 <aside className={styles.rail} aria-label="Mettelo Lab workspace"><div className={styles.railIdentity}><p className={styles.railKicker}>METTELO ECOSYSTEM</p><h2 className={styles.labName}>Mettelo Lab</h2><a className={styles.projectTitle} href={`/member/lab/${teamId}`}>{project?.name||team.project_ref}</a></div><div className={styles.navGroup}><p className={styles.navTitle}>Core</p><Suspense fallback={null}><MetteloLabNavigation solo={team.participation==='solo'} placement="rail-primary" className={styles.nav}/></Suspense></div><div className={styles.navGroup}><p className={styles.navTitle}>Project tools</p><Suspense fallback={null}><MetteloLabNavigation solo={team.participation==='solo'} placement="rail-tools" className={styles.nav}/></Suspense></div><div className={styles.railContext}><small>Your context</small><strong>{team.label}</strong><span>{team.status}</span></div><Link className={styles.backLink} href="/member/lab">← My Labs</Link></aside>
 <div className={styles.stage}><nav className="labReturnNav" aria-label="Lab workspace location"><Link href="/member">Member home</Link><span aria-hidden="true">/</span><Link href="/member/lab">My Labs</Link><span aria-hidden="true">/</span><span aria-current="page">{team.label}</span></nav><header className={styles.mobileHeader} hidden={view==='home'}><div><p className={styles.kicker}>METTELO LAB</p><strong>{project?.name||team.project_ref}</strong></div></header><section id="mettelo-lab-content" className={styles.main} tabIndex={-1}><div className={styles.content}>
 <div className="labWorkspaceHeading"><div className="eyebrow">{team.label} · {team.status}</div><h1>{view==='home'?(project?.name||team.project_ref):view==='events'?'Meetings':view==='support'?'Get support':view==='proof'?'Contributions':view.charAt(0).toUpperCase()+view.slice(1)}</h1></div>
 {data.can_lead&&team.status==='active'&&<a className="pcTextLink labManageLink" href={`/member/market?tab=manage&team=${teamId}`}>Find &amp; manage collaborators →</a>}{q.notice&&<p className="labNotice" role="status">{q.notice}</p>}{q.error&&<p className="labNotice labError" role="alert">{q.error}</p>}{!writable&&<p className="collectionNotice">{team.status==='forming'?'Staff preparation preview. The accepted member’s Lab opens automatically when all readiness checks pass.':team.status==='paused'?'This Lab is paused. Mettelo must review it before work resumes.':'This completed Lab is read-only. Your recorded work remains available.'}</p>}
 {view==='home'&&<LabHome brief={project?.brief||''} tasks={tasks} milestones={items('milestone')} contributions={items('contribution')} members={members} currentUserId={user.id} status={team.status} solo={team.participation==='solo'}/>}
 {view==='plan'&&<LabPlan teamId={teamId} milestones={items('milestone')} members={members} canPlan={canPlan} evidence={items('contribution')} problem={project?.problem||project?.brief||'Review the full project brief with your team.'} briefUrl={`${publicWebsiteOrigin()}/projects/${team.project_ref.toLowerCase()}/`}/>}
 {view==='tasks'&&<LabTasks key={q.filter||'all'} teamId={teamId} tasks={tasks} members={members} currentUserId={user.id} canPlan={canPlan} writable={writable} initialFilter={q.filter}/>}
 {view==='chat'&&<div className={'labChatCanvas '+chatMessageStyles.experience+' '+chatComposerStyles.composerExperience}><div data-lab-view="chat"><ProjectMessagePanel projectId={team.project_ref} projectRunId={teamId} currentUserId={user.id} team={chatTeam} initialMessages={initialChat} canLead={team.coordinator_id===user.id} solo={team.participation==='solo'} readOnly={!writable||!members.some(m=>m.id===user.id)} readOnlyMessage={labReadOnlyMessage({status:team.status,solo:team.participation==='solo',isMember:members.some(m=>m.id===user.id)})}/></div></div>}
 {view==='data'&&<><section className="lw lwSourcePanel"><span className="lwEyebrow">Source guidance</span><h2>Use the right data, responsibly.</h2><p>Check the original provider’s licence and the project’s reuse rules before downloading, sharing or publishing data. A Lab place does not grant additional data permissions.</p><div className="lwSourceLinks">{guide?.data_guide&&<a href={guide.data_guide} target="_blank" rel="noopener noreferrer">Project data guide ↗</a>}{guide?.governance_guide&&<a href={guide.governance_guide} target="_blank" rel="noopener noreferrer">Project governance ↗</a>}<a href={`${publicWebsiteOrigin()}/projects/data-use/`}>Data reuse guidance ↗</a></div>{!guide&&<p>Ask Mettelo to confirm the source guidance before proceeding.</p>}</section><LabLinks teamId={teamId} links={items('resource')} members={members} canAdd={writable||canPlan} view="data"/></>}
 {view==='resources'&&<>{project?.repository&&<section className="lw lwSourcePanel"><span className="lwEyebrow">Project reference</span><h2>Master project repository</h2><p>Read the project brief and source documentation here. Record your own work in the repository agreed by your team.</p><a className="lwButton" href={project.repository} target="_blank" rel="noopener noreferrer">Open project repository ↗</a></section>}<LabLinks teamId={teamId} links={items('resource')} members={members} canAdd={writable||canPlan} view="resources"/></>}
 {view==='proof'&&<><LabEvidence teamId={teamId} entries={items('contribution')} members={members} currentUserId={user.id} writable={writable} readOnlyReason={writeAvailability} solo={team.participation==='solo'}/>{recognition?.error?<p role="status">Progress recognition could not load. Refresh to try again.</p>:<LabRecognition teamId={teamId} entries={items('contribution')} currentUserId={user.id} canLead={data.can_lead} status={team.status} delivery={recognition?.data?.delivery||null} skills={recognition?.data?.skills||[]}/>}</>}
 {view==='events'&&await (async()=>{const meetingData=await labRpc(db,'meetings',{team_id:teamId});return <LabMeetings teamId={teamId} meetings={meetingData.meetings} canSchedule={meetingData.can_schedule} readOnlyReason={team.status==='active'?'Meeting booking requires active project access. Contact Mettelo if you believe this is incorrect.':writeAvailability}/>;})()}
 {view==='support'&&await (async()=>{const support=await labRpc(db,'support_list',{team_id:teamId,personal:'true'});return <LabSupport teamId={teamId} teamLabel={team.label} projectTitle={project?.name} cases={support.cases}/>;})()}
 {view==='team'&&<><LabTeamRoster members={members} currentUserId={user.id} coordinatorId={team.coordinator_id} label={team.label} status={team.status} items={data.items}/><a href="?view=support">Contact Mettelo privately →</a></>}
 </div></section><Suspense fallback={null}><MetteloLabNavigation solo={team.participation==='solo'} placement="mobile" className={styles.mobileNav}/></Suspense></div>
 </div></div>;
}
