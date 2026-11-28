import 'server-only';
import {createServerSupabaseClient} from './supabase/server';
export async function savedOpportunitySnapshot(ids:string[]){
 try{
  const db=await createServerSupabaseClient();const {data:{user},error}=await db.auth.getUser();
  if(!user?.email_confirmed_at)return {signedOut:true,ids:undefined};
  if(error)return {signedOut:false,ids:undefined};
  if(!ids.length)return {signedOut:false,ids:[] as string[]};
  const {data,error:readError}=await db.from('saved_opportunities').select('opportunity_id').eq('user_id',user.id).in('opportunity_id',ids);
  return {signedOut:false,ids:readError?undefined:(data||[]).map(row=>row.opportunity_id as string)};
 }catch{return {signedOut:false,ids:undefined};}
}
