import {connectSystemCopy} from '@/lib/connect-copy.mjs';
import Action from './MarketActionForm';
import PeopleDirectory from './PeopleDirectory';
import RecruitmentPanel,{type RecruitmentContext} from './RecruitmentPanel';
import CollaborationRequestCard from './CollaborationRequestCard';
import {directoryDetailHref} from '@/lib/market-directory.mjs';
import MarketWorkspace from './MarketWorkspace';
import {redirect} from 'next/navigation';
import {labSession,labRpc,type LabCard} from '@/lib/lab';
import {marketRpc,type MarketProject,type MarketPerson,type MarketLab,type MarketRequest,type MarketManagement} from '@/lib/lab-market';
import {type ParticipationUsage} from '@/components/lab/LabParticipationUsage';
import MarketSearch from './MarketSearch';
import MarketHome from './MarketHome';
import '../lab/journey.css';
import './market.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const query=await searchParams;if(query.tab==='projects')redirect('/member/market?'+new URLSearchParams({category:'projects',...(query.q?{q:query.q.slice(0,150)}:{})}));if(!query.tab)return <MarketHome query={query}/>;const tab=['projects','people','requests','manage'].includes(query.tab||'')?query.tab!:'projects';
 const page=Math.max(1,Math.min(100000,Number.parseInt(query.page||'1',10)||1)),q=(query.q||'').slice(0,150),area=(query.area||'').slice(0,120);
 const {db,user}=await labSession();if(!user)redirect('/signin?next=%2Fmember%2Fmarket');
 const results=await Promise.allSettled([marketRpc(db,'my_labs'),labRpc(db,'participation_usage'),tab==='manage'?Promise.resolve(null):marketRpc(db,tab==='requests'?'inbox':tab,{page,q,area}),tab==='manage'?labRpc(db,'mine'):Promise.resolve([])]);
 const labs:MarketLab[]=results[0].status==='fulfilled'?results[0].value:[];
 const usage:ParticipationUsage|null=results[1].status==='fulfilled'?results[1].value:null;
 const listing=results[2].status==='fulfilled'?results[2].value:null;
 let management:MarketManagement|null=null,manageError=false;
 const team=query.team||labs[0]?.team_id;
 if(tab==='manage'&&team)try{management=await marketRpc(db,'manage',{team_id:team});}catch{manageError=true;}
 let recruitmentContext:RecruitmentContext|undefined;
 if(tab==='manage'&&management){
  const owned:LabCard|undefined=results[3].status==='fulfilled'?(results[3].value as LabCard[]).find(c=>c.team_id===team):undefined;
  if(owned)recruitmentContext={title:owned.title,label:owned.label,project_ref:owned.project_ref,status:owned.team_status,members:typeof owned.confirmed==='number'&&typeof owned.collaborators==='number'?owned.confirmed+owned.collaborators:undefined};
  else if(management.can_set_capacity){const {data}=await db.rpc('website_project_admin_directory',{p_action:'team',p_payload:{team_id:team}});if(data?.team)recruitmentContext={label:data.team.label,project_ref:data.team.project_ref,status:data.team.status,members:data.team.members.filter((m:{status:string})=>m.status==='confirmed').length};}
 }
 const projects:MarketProject[]=tab==='projects'?listing?.rows||[]:[],people:MarketPerson[]=tab==='people'?listing?.rows||[]:[],requests:MarketRequest[]=tab==='requests'?listing?.rows||[]:[];
 const href=(target:string,nextPage=1)=>'/member/market?'+new URLSearchParams({tab:target,...(q?{q}:{}),...(target==='people'&&area?{area}:{}),...(nextPage>1?{page:String(nextPage)}:{})});
 const headings:Record<string,[string,string]>={projects:['Explore projects','Find active Labs with room for your skills and ideas.'],people:['Discover people','Meet members who share your interests. Start a conversation or build together.'],requests:['Requests & invitations','Keep track of the people and projects you want to work with.'],manage:['Find collaborators','Create a recruitment opportunity for your active Lab, then manage requests and approved collaborators.']};
 return <MarketWorkspace active={tab} title={headings[tab][0]} description={headings[tab][1]} usage={usage}>
  {query.notice&&<p className="marketNotice" role="status">{connectSystemCopy(query.notice)}</p>}{query.error&&<p className="marketNotice marketError" role="alert">{connectSystemCopy(query.error)}</p>}
  {['projects','people'].includes(tab)&&<MarketSearch tab={tab} query={q} area={area}/>}
  {tab!=='manage'&&listing&&<div className="workspaceResults"><h2>{tab==='projects'?'Recruiting Labs':tab==='people'?'Member directory':'Your collaboration activity'}</h2><span>{typeof listing.total==='number'?listing.total+' '+(listing.total===1?'result':'results'):'Page '+page}</span></div>}
  {tab!=='manage'&&!listing?<div className="pcEmpty" role="alert"><h2>Connect records could not load.</h2><p>Your records are unchanged.</p><a href={href(tab)}>Try again</a></div>:<>
   {tab==='projects'&&<div className="marketList">{projects.map(project=><article className="marketCard" key={project.team_id}><header><span className="pcEyebrow">{project.origin} · {project.project_ref}</span><span>{project.available} collaborator {project.available===1?'seat':'seats'}</span></header><h2><a href={directoryDetailHref('projects',project.team_id,query)}>{project.title}</a></h2><p>{project.description.length>280?project.description.slice(0,280).trimEnd()+'…':project.description}</p><div className="marketTags">{project.skills.map(skill=><span key={skill}>{skill}</span>)}</div><p className="marketMeta">Commitment: {project.commitment}</p><div className="marketTags" aria-label="Advertised roles">{project.roles.map(role=><span key={role}>{role}</span>)}</div><a className="pcButton primary workspaceViewProject" href={directoryDetailHref('projects',project.team_id,query)}>View project</a><details><summary className="pcButton">Request to collaborate</summary><Action action="request" tab={tab} team={project.team_id}><label>Advertised role<select name="role" required>{project.roles.map(role=><option key={role}>{role}</option>)}</select></label><label>How would you contribute?<textarea name="proposal" minLength={10} maxLength={2000} rows={3} required/></label><label>Your availability and commitment<input name="commitment" minLength={3} maxLength={300} required/></label><label className="marketCheck"><input type="checkbox" required/>I can support this role and the commitment I’ve described.</label><button className="pcButton primary">Send collaboration request</button></Action></details></article>)}</div>}
   {tab==='people'&&<PeopleDirectory people={people} labs={labs} userId={user.id} query={query}/> }
   {tab==='requests'&&<div className="marketList">{requests.map(record=><CollaborationRequestCard key={record.id} record={record} userId={user.id} page={page}/>)}</div>}
   {tab!=='manage'&&listing?.rows?.length===0&&<div className="pcEmpty"><h2>{tab==='projects'?(q?'No projects match this search.':'No matching Labs are recruiting.'):tab==='people'?'No discoverable members match this search.':'No requests or invitations yet.'}</h2><p>{tab==='projects'&&q?'Try a different role, project name or skill. Clear the search to browse all recruiting Labs.':tab==='projects'?'A Lab appears here when it is active and its leader opens approved collaborator seats.':tab==='people'?'Members choose whether to appear here. Try another name or skill.':'Project requests and invitations will appear here when they are sent.'}</p><a className="pcButton" href={tab==='projects'?'/member/market':tab==='people'?'/member/market?tab=people':'/member/market?tab=projects'}>{tab==='projects'?'Visit the community':tab==='people'?'Browse all members':'Explore recruiting Labs'}</a></div>}
  </>}
  {tab==='people'&&<details className="marketProfileGuide"><summary>How member profiles and visibility work</summary><p>Open a person’s name or photo to read the profile details they have chosen to share. You need a verified, permitted account to use member discovery; a Lab place or 80% profile completion is not required.</p><p>Profiles are opt-in. Hidden, unavailable and blocked profiles cannot be opened here. Messaging and invitations have their own contact permission and acceptance checks. Education, employment history and your private Portfolio are not automatically shared.</p><a href="/member/profile#market-visibility">Manage your visibility in My profile</a></details>}
  {tab==='manage'&&<RecruitmentPanel labs={labs} team={team} management={management} context={recruitmentContext} error={manageError}/>}
  {tab!=='manage'&&listing&&(page>1||listing.rows?.length>0)&&<nav className="marketPagination" aria-label="Connect pages"><span>Page {page}{typeof listing.total==='number'?` · ${listing.total} matches`:''}</span><div>{page>1&&<a href={href(tab,page-1)}> Previous</a>}{(typeof listing.total==='number'?page*25<listing.total:listing.rows?.length===25)&&<a href={href(tab,page+1)}>Next</a>}</div></nav>}
 </MarketWorkspace>;
}
