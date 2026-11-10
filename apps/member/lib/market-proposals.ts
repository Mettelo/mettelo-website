import 'server-only';
import type {labSession} from './lab';
import {websiteProject} from './project-catalogue';
type Db=Awaited<ReturnType<typeof labSession>>['db'];
export async function proposalRpc(db:Db,action:string,payload:Record<string,unknown>={}){const {data,error}=await db.rpc('website_market_proposals',{p_action:action,p_payload:payload});if(error)throw error;return data;}
export type Proposal={id:string;owner_id?:string;title:string;problem:string;description:string;outcome:string;category:string;skills:string[];participation:string;commitment:string;milestones:string;collaboration:string;supporting_url:string;state:string;version?:number;review_note?:string;project_ref?:string;created_at?:string};
export async function resolveWebsiteProject(db:Db,id:string){
 const existing=websiteProject(id);if(existing)return existing;
 if(!/^MTL-MP-[A-F0-9]{12}$/i.test(id))return null;
 const result=await proposalRpc(db,'detail',{project_ref:id.toUpperCase()});const proposal=result.proposal as Proposal;
 if(proposal.state!=='approved'||!proposal.project_ref)return null;
 const {data,error}=await db.from('website_project_briefs').select('project_ref,title,roles').eq('project_ref',proposal.project_ref).maybeSingle();
 if(error)throw error;if(!data||!Array.isArray(data.roles))return null;
 return {id:data.project_ref as string,name:data.title as string,roles:data.roles as string[],brief:proposal.description,problem:proposal.problem,repository:proposal.supporting_url};
}
