import {labSession} from '@/lib/lab';
import SupportAssignment,{type AssignmentData} from './SupportAssignment';
export default async function SupportOwnership({source,id}:{source:'member'|'public';id:string}){const {db}=await labSession();const {data,error}=await db.rpc('website_admin_readiness',{p_action:'case',p_payload:{source,id}});if(error)throw Error('Support ownership could not be loaded.');return <SupportAssignment key={data.assignment.version} source={source} id={id} initial={data as AssignmentData}/>;}
