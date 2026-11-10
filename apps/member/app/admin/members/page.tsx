import {labSession} from '@/lib/lab';
import MembersConsole from './MembersConsole';
import './members.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{q?:string;status?:string;page?:string}>}){
 const query=await searchParams;const {db}=await labSession();
 const {data,error}=await db.rpc('website_manage_members',{p_action:'list',p_payload:{q:(query.q||'').slice(0,100),status:['all','active','suspended','unverified'].includes(query.status||'')?query.status:'all',page:/^\d+$/.test(query.page||'')?Number(query.page):1}});
 if(error)return <section className="section"><div className="shell"><h1>Members could not load</h1><p>Use your approved member administrator account, or reload if the connection was interrupted.</p><a href="/admin/members">Reload members →</a></div></section>;
 return <MembersConsole initial={data} query={query.q||''} filter={query.status||'all'}/>;
}
