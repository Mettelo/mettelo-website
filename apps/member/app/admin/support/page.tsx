import {labSession} from '@/lib/lab';
import SupportInbox,{type SupportDirectory} from '@/components/lab/SupportInbox';
import {supportFilters} from '@/lib/support-directory.mjs';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const filters=supportFilters(await searchParams),{db}=await labSession();
 const {data,error}=await db.rpc('website_support_directory',{p_payload:filters});
 if(error?.code==='42501')return <section className="section"><div className="shell"><h1>Support administrator access required</h1></div></section>;
 if(error||!data)throw new Error('Support enquiries could not be loaded. Please try again.');
 return <section className="section"><div className="shell"><SupportInbox data={data as SupportDirectory} filters={filters}/></div></section>;
}
