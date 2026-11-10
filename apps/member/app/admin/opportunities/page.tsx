import {opportunityAdmin} from '@/lib/opportunities/admin';
import PipelineConsole from './PipelineConsole';
import {durableScanProgress} from '@/lib/opportunities/durable-workhub-scan.mjs';
export const dynamic='force-dynamic';
export default async function Page(){
 let db;try{db=await opportunityAdmin();}catch{return <section className="section"><div className="shell"><h1>Administrator access required</h1><p>This temporary control page is restricted to approved website administrators.</p><a href="/signin">Sign in</a></div></section>;}
 const {data,error}=await db.rpc('website_opportunity_admin',{p_action:'list'});
 if(error)throw Error('Pipeline controls could not load.');
 return <PipelineConsole initial={{...data,scanProgress:await durableScanProgress(db)}}/>;
}
