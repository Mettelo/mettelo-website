import 'server-only';
import type {labSession} from './lab';
export async function communityRpc(db:Awaited<ReturnType<typeof labSession>>['db'],action:string,payload:Record<string,unknown>={}){
 const {data,error}=await db.rpc('website_lab_community',{p_action:action,p_payload:payload});
 if(error)throw error;return data;
}
export type CommunityPost={entry_type?:'post'|'project'|'proposal';source_id?:string;title?:string;roles?:string[];commitment?:string;available?:number;id:string;author_id:string;author:string;username?:string;kind:string;body:string;topics:string[];project_ref?:string;team_id?:string;created_at:string;likes?:number;comments?:number;liked?:boolean;bookmarked?:boolean;following?:boolean};
export type CommunityComment={id:string;author_id:string;author:string;parent_id:string|null;body:string;created_at:string};
export type Conversation={id:string;member_id:string;name:string;state:string;requested_by:string;unread?:number};
export type MarketMessage={id:string;sender_id:string;body:string;project_ref?:string;created_at:string};
