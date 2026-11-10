import 'server-only';
import {cache} from 'react';
import {createServerSupabaseClient} from './supabase/server';
export type PublicRecruitment={title:string;project_ref:string;description:string;roles:string[];skills:string[];commitment:string;available:number};
export const readPublicRecruitment=cache(async(token:string):Promise<PublicRecruitment|null>=>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token))return null;
 const db=await createServerSupabaseClient(),{data,error}=await db.rpc('website_public_recruitment_share',{p_token:token});
 if(error)throw Error('Recruitment summary could not load.');return data as PublicRecruitment|null;
});
