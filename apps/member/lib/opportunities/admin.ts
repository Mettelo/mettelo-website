import 'server-only';
import {createServerSupabaseClient} from '../supabase/server';
export async function opportunityAdmin(){
 const db=await createServerSupabaseClient();
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user?.email_confirmed_at)throw Error('Sign in with your verified administrator account.');
 const {data,error:denied}=await db.rpc('website_opportunity_admin',{p_action:'access'});
 if(denied||data?.allowed!==true)throw Error('Administrator access required.');
 return db;
}
