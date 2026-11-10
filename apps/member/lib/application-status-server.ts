import 'server-only';
import type {createServerSupabaseClient} from './supabase/server';
export async function applicationStatuses(db:Awaited<ReturnType<typeof createServerSupabaseClient>>){
 const {data,error}=await db.rpc('website_application_statuses');
 if(error)throw new Error('Application updates could not be loaded. Please try again.');
 return new Map<string,string>((data||[]).map((row:{id:string;status:string})=>[row.id,row.status]));
}
