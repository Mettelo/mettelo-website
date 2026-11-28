import {createClient} from '@supabase/supabase-js';
import {memberSupabaseConfiguration} from './supabase/config';

export type Opportunity={id:string;title:string;organisation:string|null;opportunity_type:string;summary:string|null;location:string|null;eligibility:string|null;source_url:string|null;official_application_url:string|null;closes_at:string|null;published_at:string|null;last_verified_at:string|null;verification_status:string|null;data_ai_relevance_score:number|null;role_family:string|null;role_category:string|null;remote_scope:string|null;source_organisation:string|null;source_type:string|null;country_code:string|null;region_code:string|null;applicant_scope:string;work_arrangement:string|null;sponsorship_status:string};
const fields='id,title,organisation,opportunity_type,summary,location,eligibility,source_url,official_application_url,closes_at,published_at,last_verified_at,verification_status,data_ai_relevance_score,role_family,role_category,remote_scope,source_organisation,source_type,country_code,region_code,applicant_scope,work_arrangement,sponsorship_status';
function publicClient(){const {url,key}=memberSupabaseConfiguration();return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
export async function loadOpportunities(){
  try{
    const {data,error}=await publicClient().from('opportunities').select(fields).eq('status','published').eq('access_level','public').eq('data_ai_relevance_status','high').or(`closes_at.is.null,closes_at.gt.${new Date().toISOString()}`).order('published_at',{ascending:false}).limit(500);
    return {items:(error?[]:data||[]) as Opportunity[],unavailable:Boolean(error)};
  }catch{return {items:[] as Opportunity[],unavailable:true};}
}
export async function loadOpportunity(id:string){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {item:null,unavailable:false};
  try{
    const {data,error}=await publicClient().from('opportunities').select(fields).eq('id',id).eq('status','published').eq('access_level','public').eq('data_ai_relevance_status','high').maybeSingle();
    return {item:data as Opportunity|null,unavailable:Boolean(error)};
  }catch{return {item:null,unavailable:true};}
}
