import {notFound} from 'next/navigation';
import SupportOwnership from '@/components/lab/SupportOwnership';
import {labSession,labRpc} from '@/lib/lab';
import EnquiryThread from '@/components/lab/EnquiryThread';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{caseId:string}>}){const {caseId}=await params;if(!/^[0-9a-f-]{36}$/i.test(caseId))notFound();const {db}=await labSession();const {data:access}=await db.rpc('website_lab',{p_action:'access'});if(!access?.allowed)notFound();let data;try{data=await labRpc(db,'support_case',{case_id:caseId});}catch{notFound();}const list=await labRpc(db,'support_list'),summary=list.cases.find((c:{id:string})=>c.id===caseId);return <section className="section"><div className="shell"><SupportOwnership source="member" id={caseId}/><EnquiryThread admin enquiry={{...data.case,...summary}} replies={data.replies}/></div></section>;}
