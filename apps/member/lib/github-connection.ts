import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {memberSupabaseConfiguration} from '@/lib/supabase/config';
import {githubConfiguration,inviteGithubMember,githubInstallation} from './github-org.mjs';
export type GithubConnection={connected:boolean;github_id?:string;login?:string;org_status:string;checked_at?:string;required_for_projects:boolean;invitation_id?:number;error_code?:string};
export async function githubStatus(db:any,action='status'):Promise<GithubConnection>{const {data,error}=await db.rpc('website_github',{p_action:action});if(error)throw Error('Your GitHub connection could not be checked.');return data;}
function worker(){const {url}=memberSupabaseConfiguration();const key=process.env.METTELO_GITHUB_SUPABASE_SERVICE_ROLE_KEY;if(!key)throw Error('GitHub organisation setup is not complete.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function workerRpc(action:string,payload:Record<string,unknown>){const {data,error}=await worker().rpc('website_github_worker',{p_action:action,p_payload:payload});if(error)throw Error('GitHub organisation status could not be updated.');return data;}
export async function syncGithub(db:any,userId:string,allowResend=false){
 const status=await githubStatus(db,'sync');const config=githubConfiguration();
 if(!status.connected||!config.configured)return status;
 const claim=await workerRpc('claim',{user_id:userId});if(claim.skip)return claim.status||status;
 let result;try{result=await inviteGithubMember(config,claim.github_id,{previousStatus:status.org_status,priorInvitationId:status.invitation_id,allowResend})}catch(error){const code=(error as {code?:string}).code||'github_unavailable';result={org_status:code==='delivery_unknown'?'unknown':'failed',error_code:code};}
 return workerRpc('finish',{user_id:userId,lease:claim.lease,github_id:claim.github_id,...result});
}
export async function githubProviderEnabled(){const {url,key}=memberSupabaseConfiguration();try{const response=await fetch(url+'/auth/v1/settings',{headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(5000)});const data=await response.json();return response.ok&&data.external?.github===true}catch{return false}}
export async function activateGithubRequirement(actor:string){if(!await githubProviderEnabled())throw Error('Enable GitHub sign-in in the staging authentication settings first.');await githubInstallation(githubConfiguration());await workerRpc('policy',{user_id:actor,enabled:true});}
