import {notFound} from 'next/navigation';
import SupportOwnership from '@/components/lab/SupportOwnership';
import {labSession} from '@/lib/lab';
import PublicContactThread from '@/components/lab/PublicContactThread';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{contactId:string}>}){const {contactId}=await params;if(!/^[0-9a-f-]{36}$/i.test(contactId))notFound();const {db}=await labSession();const {data,error}=await db.rpc('website_contact_admin',{p_action:'case',p_payload:{id:contactId}});if(error||!data)notFound();return <section className="section"><div className="shell"><SupportOwnership source="public" id={contactId}/><PublicContactThread contact={data.case} notes={data.notes}/></div></section>;}
