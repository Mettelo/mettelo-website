import 'server-only';
import type {labSession} from './lab';
export async function marketRpc(db:Awaited<ReturnType<typeof labSession>>['db'],action:string,payload:Record<string,unknown>={}){
 const {data,error}=await db.rpc('website_lab_market',{p_action:action,p_payload:payload});
 if(error)throw error;return data;
}
export type MarketProject={team_id:string;project_ref:string;title:string;description:string;roles:string[];skills:string[];commitment:string;available:number;origin:string};
export type MarketPerson={id:string;username:string|null;full_name:string|null;headline:string|null;skills:string[]|null;contactable:boolean;following?:boolean};
export type MarketLab={team_id:string;title:string;label:string;project_ref:string;roles?:string[]};
export type MarketRequest={id:string;team_id:string;kind:'request'|'invitation';member_id:string;initiated_by?:string;role:string;proposal:string;commitment:string;state:string;expires_at:string;title:string;member_name:string;can_manage:boolean};
export type MarketManagement={team_id:string;can_manage:boolean;can_set_capacity:boolean;catalogue_roles:string[];occupied:number;recruitment:{collaborator_capacity:number;open:boolean;description:string;roles:string[];skills:string[];commitment:string}|null;members:{user_id:string;name:string;role:string;status:string;revocation_pending:boolean}[]};
