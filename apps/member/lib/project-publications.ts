import 'server-only';
import type {labSession} from './lab';
export type PublishedProject={project_ref:string;title:string;problem:string;description:string;outcome:string;category:string;skills:string[];participation:string;commitment:string;milestones:string;collaboration:string;repository_url:string;roles:string[];published_at:string};
export type PublishedProjects={rows:PublishedProject[];page:number;page_size:number;total:number};
export async function publishedProjects(db:Awaited<ReturnType<typeof labSession>>['db'],ref='',page=1,q=''):Promise<PublishedProjects>{const {data,error}=await db.rpc('website_project_publications',{p_ref:ref,p_page:page,p_q:q});if(error)throw Error('Published projects could not load.');return data as PublishedProjects;}
