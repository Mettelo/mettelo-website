import Link from 'next/link';
import {randomUUID,createHash} from 'node:crypto';
import {redirect} from 'next/navigation';
import {labSession,type LabAdminSnapshot,type LabInterest,type LabTeam} from '@/lib/lab';
import {projectDirectoryFilters,projectDirectoryHref} from '@/lib/project-directory.mjs';
import LabActionForm from '@/components/lab/LabActionForm';
import ProjectOperations from './ProjectOperations';
import ProjectDrawer from './ProjectDrawer';
import ProjectPublisherModal from './ProjectPublisherModal';
import '../../member/lab/lab.css';
import './projects.css';
import './directory.css';
export const dynamic='force-dynamic';
type Row={id:string;name?:string;label?:string;project_ref:string;project_title?:string;coordinator_name?:string;confirmed?:number;maximum_members?:number;status?:string;participation:string;actions?:string[];created_at?:string;submitted_at?:string;role?:string;review_status?:string;allocated?:boolean;restricted?:boolean};
type Directory={rows:Row[];total:number;page:number;page_size:number;projects:LabAdminSnapshot['projects'];metrics:{applications:number;attention:number;active:number;enquiries:number}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams,filters=projectDirectoryFilters(query);
 const {db,user}=await labSession();if(!user)redirect('/signin?next=%2Fadmin%2Fprojects');
 async function read(action:string,payload:Record<string,unknown>){const {data,error}=await db.rpc('website_project_admin_directory',{p_action:action,p_payload:payload});if(error)throw error;return data;}
 let data:Directory;
 try{data=await read('list',filters);}catch{return <section className="section operations"><div className="shell"><h1>Project controls could not load</h1><p>Your account needs project administrator access. If you are already authorised, reload to try again.</p><a href="/admin/projects">Reload project controls →</a></div></section>;}
 const current={...filters,page:data.page},href=(changes:Record<string,unknown>={})=>projectDirectoryHref(current,changes),returnTo=href();
 let detail:React.ReactNode=null;
 const selectedProject=data.projects.find(p=>p.ref===filters.project);
 if(query.team||query.application||query.form){
  try{
   const snapshot:LabAdminSnapshot={workflow_version:2,responsibilities_version:1,projects:data.projects,interests:[],teams:[]};
   let mode:'team'|'application'|'formation'='formation',title='Create a placement',candidateTotal=0;
   if(typeof query.team==='string'){
    if(!/^[0-9a-f-]{36}$/i.test(query.team))throw Error();
    const record=await read('team',{team_id:query.team});snapshot.teams=[record.team as LabTeam];mode='team';title=record.team.label;
    const pool=await read('candidates',{project:record.team.project_ref,arrangement:record.team.participation});snapshot.interests=pool.rows;candidateTotal=pool.total;
   }else if(typeof query.application==='string'){
    if(!/^[0-9a-f-]{36}$/i.test(query.application))throw Error();
    const record=await read('application',{interest_id:query.application});snapshot.interests=[record.interest as LabInterest];mode='application';title=record.interest.name;
   }else{
    if(!selectedProject||!['solo','team'].includes(String(query.form)))throw Error();
    const pool=await read('candidates',{project:filters.project,arrangement:query.form});snapshot.interests=pool.rows;candidateTotal=pool.total;
   }
   detail=<ProjectDrawer key={`${mode}:${query.team||query.application||query.form}`} title={title} returnTo={returnTo}><ProjectOperations key={createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')} initial={snapshot} mode={mode} formationProject={selectedProject?.ref} arrangement={query.form==='solo'?'solo':'team'} candidateTotal={candidateTotal} returnTo={returnTo} referenceSeed={randomUUID().slice(0,8).toUpperCase()}/>{mode==='team'&&<a className="pcTextLink" href={`/member/market?tab=manage&team=${query.team}`}>Market collaboration settings →</a>}</ProjectDrawer>;
  }catch{detail=<ProjectDrawer title="Record unavailable" returnTo={returnTo}><p>This record could not load. Close this panel and try again. No changes have been made.</p></ProjectDrawer>;}
 }
 const title=filters.section==='attention'?'Needs attention':filters.section==='teams'?'Team directory':'Application review';
 return <section className="section operations projectDirectory"><div className="shell"><header className="opsHeading"><div><div className="eyebrow">Project operations</div><h1>Keep every team moving.</h1><p>Find a placement, resolve the next issue and return to your work.</p></div><div className="marketActions"><ProjectPublisherModal/><Link className="button ghost" href="/member/market/proposals?view=queue">Project proposals →</Link><Link className="button ghost" href="/member/market/moderation">Market reports →</Link><Link className="button ghost" href="/member/lab">Member Lab view ↗</Link></div></header>
 <div className="opsMetrics">{[
  {label:'Applications awaiting review',value:data.metrics.applications,url:href({section:'applications',review:'new',status:'all',arrangement:'all',q:'',page:1})},
  {label:'Placements needing action',value:data.metrics.attention,url:href({section:'attention',status:'all',arrangement:'all',q:'',page:1})},
  {label:'Active Labs',value:data.metrics.active,url:href({section:'teams',status:'active',arrangement:'all',q:'',page:1})},
  {label:'Open project enquiries',value:data.metrics.enquiries,url:'/admin/support'}
 ].map(metric=><Link href={metric.url} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>Open section →</small></Link>)}</div>
 <nav className="opsTabs" aria-label="Project operations sections">{[['attention','Needs attention'],['teams','Teams'],['applications','Applications']].map(([section,label])=><Link href={href({section,page:1,status:'all',review:'all',arrangement:'all'})} key={section} aria-current={filters.section===section?'page':undefined}>{label}</Link>)}</nav>
 <form className="directoryFilters" action="/admin/projects" method="get"><input type="hidden" name="section" value={filters.section}/><label>Project<select name="project" defaultValue={filters.project}><option value="all">All projects</option>{data.projects.map(p=><option key={p.ref} value={p.ref}>{p.ref} · {p.title}</option>)}</select></label><label>Search<input name="q" type="search" maxLength={150} defaultValue={filters.q} placeholder={filters.section==='applications'?'Applicant, role or project':'Team, project, coordinator or member'}/></label><label>{filters.section==='applications'?'Review status':'Lab status'}{filters.section==='applications'?<select name="review" defaultValue={filters.review}>{['all','new','clarification','shortlisted','declined','withdrawn'].map(s=><option key={s} value={s}>{s==='all'?'All reviews':s}</option>)}</select>:<select name="status" defaultValue={filters.status}>{['all','forming','active','paused','completed'].map(s=><option key={s} value={s}>{s==='all'?'All live statuses':s}</option>)}</select>}</label><label>Arrangement<select name="arrangement" defaultValue={filters.arrangement}><option value="all">All arrangements</option><option value="solo">Solo</option><option value="team">Team</option>{filters.section==='applications'&&<option value="flexible">Flexible</option>}</select></label><button className="button dark">Apply filters</button><Link href={projectDirectoryHref({...filters,project:'all',status:'all',arrangement:'all',review:'all',q:'',page:1})}>Clear filters</Link></form>
 <div className="opsSectionTitle"><div><h2>{title}</h2><p>{filters.section==='attention'?'Outstanding checks, overdue offers and project enquiries.':'Showing 25 records per page. Open a record for its details and actions.'}</p></div><span>{data.total} {filters.section==='applications'?'applications':'placements'}</span></div>
 {selectedProject&&<div className="opsActions"><Link className="button dark" href={href({form:'team'})} scroll={false}>Form a team</Link><Link className="button ghost" href={href({form:'solo'})} scroll={false}>Offer a Solo placement</Link></div>}
 <div className="directoryTableWrap"><table className="directoryTable"><caption className="directoryCaption">{title} · {data.total} records</caption><thead><tr>{(filters.section==='applications'?['Applicant','Project / role','Arrangement','Review','Submitted','Action']:['Team / placement','Project','Coordinator / owner','Members','Status','Needs attention','Action']).map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.rows.map(row=><tr key={row.id}>{filters.section==='applications'?<><td data-label="Applicant"><strong>{row.name}</strong>{row.allocated&&<small>Offered / placed</small>}{row.restricted&&<small>Placement restricted</small>}</td><td data-label="Project / role">{row.project_ref}<small>{row.role||'Role not specified'}</small></td><td data-label="Arrangement">{row.participation}</td><td data-label="Review"><span className="opsBadge">{row.review_status}</span></td><td data-label="Submitted">{row.submitted_at?new Date(row.submitted_at).toLocaleDateString('en-GB'):''}</td><td data-label="Action"><Link href={href({application:row.id})} scroll={false} aria-label={`Review application from ${row.name}`}>Review →</Link></td></>:<><td data-label="Team / placement"><strong>{row.label}</strong><small>{row.participation==='solo'?'Solo placement':'Team'}</small></td><td data-label="Project">{row.project_ref}<small>{row.project_title}</small></td><td data-label="Coordinator / owner">{row.coordinator_name}</td><td data-label="Members">{row.confirmed} / {row.participation==='solo'?1:row.maximum_members}</td><td data-label="Status"><span className="opsBadge">{row.status}</span></td><td data-label="Needs attention">{row.actions?.length?<ul>{row.actions.map(action=><li key={action}>{action}</li>)}</ul>:<span className="directoryQuiet">No action needed</span>}</td><td data-label="Action"><Link href={href({team:row.id})} scroll={false} aria-label={`Manage ${row.label}`}>Manage →</Link></td></>}</tr>)}</tbody></table>{!data.rows.length&&<div className="panel directoryEmpty"><h3>{filters.section==='attention'?'No placements need action in this view.':'No matching records.'}</h3><p>Try another project, status or search.</p></div>}</div>
 <nav className="directoryPagination" aria-label="Project directory pages"><span>{data.total?`${(data.page-1)*25+1}–${Math.min(data.page*25,data.total)}`:'0'} of {data.total} · Page {data.page} of {Math.max(1,Math.ceil(data.total/25))}</span><div>{data.page>1?<Link href={href({page:data.page-1})}>← Previous</Link>:<span aria-disabled="true">← Previous</span>}{data.page*25<data.total?<Link href={href({page:data.page+1})}>Next →</Link>:<span aria-disabled="true">Next →</span>}</div></nav>
 {selectedProject&&<details className="panel directoryCapacity"><summary>Project team capacity · {selectedProject.ref}</summary><LabActionForm action="project_capacity"><input type="hidden" name="project_ref" value={selectedProject.ref}/><label>Maximum members for new teams<input name="maximum_members" type="number" min={3} max={12} defaultValue={selectedProject.member_capacity||4} required/></label><p>Existing placements keep their capacity. The normal Team starting minimum remains three people.</p><button className="button ghost">Save capacity</button></LabActionForm></details>}
 {!selectedProject&&<p className="directoryHint">Choose one project to form a team or offer a Solo placement.</p>}
 </div>{detail}</section>;
}
