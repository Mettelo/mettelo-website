import ContentEditorDialog from '../content/ContentEditorDialog';
import Link from 'next/link';
import {labSession} from '@/lib/lab';
import {adminCapabilities} from '@/lib/admin-capabilities';
import {contentAdmin} from '@/lib/site-content';
import ProjectPublisherModal from '../projects/ProjectPublisherModal';
import '../content/content.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const c=await adminCapabilities();if(!c?.operations)return <section className="section"><h1>Project administrator access required</h1></section>;
 const query=await searchParams,page=Math.max(1,Math.min(100000,parseInt(query.page||'1',10)||1)),q=(query.q||'').slice(0,150),{db}=await labSession();let result;try{result=await contentAdmin(db,'list_projects',{page,q});}catch{return <section className="section"><h1>Project library could not load</h1><p>Reload to try again.</p></section>;}
 let editing=null;if(query.edit)try{editing=await contentAdmin(db,'get',{key:'project:'+query.edit});}catch{}
 const href=(next:number)=>'/admin/project-library?'+new URLSearchParams({q,page:String(next)});
 return <section className="section contentAdmin"><div className="shell"><header className="contentHeading"><div><span className="eyebrow">Project library</span><h1>Projects</h1><p>Create and maintain the briefs members discover and apply to.</p></div><ProjectPublisherModal/></header><form className="contentSearch"><label htmlFor="project-search">Find a project</label><div><input id="project-search" name="q" defaultValue={q} placeholder="Project title or reference"/><button className="button dark">Search</button></div></form><p className="contentMeta">{result.total} projects · 25 per page</p><div className="contentProjectList">{result.rows.map((row:any)=><article key={row.project_ref}><div><span className="contentMeta">{row.project_ref}</span><h2>{row.title}</h2><span className="contentStatus">{row.has_draft?'Unpublished changes':'Published brief'}</span></div><div className="contentRowActions"><Link className="button dark" href={'/admin/project-library?'+new URLSearchParams({q,page:String(page),edit:row.project_ref})}>Edit brief</Link><Link href={'/admin/projects?project='+row.project_ref}>Applications &amp; teams</Link></div></article>)}</div>{result.rows.length===0&&<p>No projects match this search.</p>}<nav className="contentPaging" aria-label="Project library pages">{page>1&&<Link className="button ghost" href={href(page-1)}>Previous</Link>}<span>Page {page} of {Math.max(1,Math.ceil(result.total/25))}</span>{page*25<result.total&&<Link className="button ghost" href={href(page+1)}>Next</Link>}</nav>{editing&&<ContentEditorDialog document={editing} returnTo={href(page)} canUpload={c.roles}/>}</div></section>;
}
