import 'server-only';
import type {labSession} from './lab';
export async function discoveryRpc(db:Awaited<ReturnType<typeof labSession>>['db'],action:string,payload:Record<string,unknown>={}){const {data,error}=await db.rpc('website_market_discovery',{p_action:action,p_payload:payload});if(error)throw error;return data;}
export type PublicMember={id:string;full_name:string;username?:string;headline?:string;skills:string[];contactable:boolean;following:boolean;bio?:string;professional_area?:string;experience_level?:string;technical_interests?:string;preferred_roles?:string;weekly_availability?:string;problem_interests?:string;location?:string};
export type PublicProject={team_id:string;project_ref:string;title:string;stage:string;origin:string;description:string;roles:string[];skills:string[];commitment:string;available:number;following:boolean;leader:{id:string;name:string;contactable:boolean};highlights:{id:string;kind:string;body:string}[]};
