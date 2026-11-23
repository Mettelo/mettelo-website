import {notFound} from 'next/navigation';
import SupportOwnership from '@/components/lab/SupportOwnership';
import {labSession,labRpc} from '@/lib/lab';
import EnquiryThread from '@/components/lab/EnquiryThread';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{caseId:string}>}){const {caseId}=await params;if(!/^[0-9a-f-]{36}$/i.test(caseId))notFound();const {db}=await labSession();const {data:access}=await db.rpc('website_lab',{p_action:'access'});if(!access?.allowed)notFound();let data;try{data=await labRpc(db,'support_case',{case_id:caseId});}catch{notFound();}const {data:directory,error}=await db.rpc('website_support_directory',{p_payload:{filter:'all',source:'member',case_id:caseId}});if(error)throw new Error('Enquiry details could not be loaded.');const summary=directory.rows[0];return <section className="section"><div className="shell"><SupportOwnership source="member" id={caseId}/><EnquiryThread admin enquiry={{...data.case,...summary}} replies={data.replies}/></div></section>;}
