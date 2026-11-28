import {notFound,redirect} from 'next/navigation';
import {labSession,labRpc} from '@/lib/lab';
import EnquiryThread from '@/components/lab/EnquiryThread';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{caseId:string}>}){const {caseId}=await params;if(!/^[0-9a-f-]{36}$/i.test(caseId))notFound();const {db,user}=await labSession();if(!user)redirect(`/signin?next=${encodeURIComponent('/member/enquiries/'+caseId)}`);let data;try{data=await labRpc(db,'support_case',{case_id:caseId});}catch{notFound();}if(data.case.reporter_id!==user.id){if(data.admin)redirect(`/admin/support/${caseId}`);notFound();}const list=await labRpc(db,'support_list',{personal:'true'}),summary=list.cases.find((c:{id:string})=>c.id===caseId);return <section className="section"><div className="shell"><EnquiryThread enquiry={{...data.case,...summary}} replies={data.replies.filter((r:{internal:boolean})=>!r.internal)} canOpenAdmin={data.admin}/></div></section>;}
