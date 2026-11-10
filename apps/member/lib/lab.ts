import 'server-only';
import {createServerSupabaseClient} from './supabase/server';
export type LabCard={collaborators?:number;admission_route?:'core'|'market';requested_participation?:string;readiness?:{ready:boolean;checks:{label:string;ready:boolean}[]};roles?:string[];can_enter?:boolean;onboarding_pending?:boolean;offer_availability?:string;offer_time_zone?:string;offer_collaboration?:string;is_nominee?:boolean;coordinator_agreed?:boolean;offer_expires_at?:string|null;commitment_confirmed?:boolean;team_id:string;project_ref:string;title:string;label:string;team_status:string;participation:'solo'|'team';role:string;membership_status:'offered'|'confirmed';lab_enabled:boolean;minimum:number;confirmed:number;access_verified:boolean;two_person_proposed:boolean;two_person_agreed:boolean};
export type LabInterest={coordinator_assignments?:number;allocated?:boolean;restricted?:boolean;review_status?:string;review_note?:string;profile?:Record<string,unknown>;id:string;project_ref:string;user_id:string;name:string;participation:string;role:string|null;motivation:string;contribution:string;answers:Record<string,unknown>;submitted_at:string};
export type LabMember={roles?:string[];external_access_revoked?:boolean;assigned_open_items?:number;admitted?:boolean;onboarding_checked?:boolean;offer_expires_at?:string|null;commitment_confirmed?:boolean;two_person_agreed?:boolean;user_id:string;name:string;role:string;status:string;accepted:boolean;access_verified:boolean};
export type LabTeam={maximum_members?:number;coordinator_nominee_id?:string|null;coordinator_agreed_at?:string|null;readiness?:{ready:boolean;checks:{label:string;ready:boolean}[]};id:string;project_ref:string;label:string;status:string;participation:string;coordinator_id:string|null;two_person_reason:string|null;lab_enabled:boolean;required_roles:string[];members:LabMember[]};
export type LabAdminSnapshot={responsibilities_version?:number;operations_version?:number;workflow_version?:number;projects:{member_capacity?:number;ref:string;title:string;roles:string[]}[];interests:LabInterest[];teams:LabTeam[]};
export async function labSession(){
 const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();
 return {db,user:user?.email_confirmed_at?user:null};
}
export async function labRpc(db:Awaited<ReturnType<typeof createServerSupabaseClient>>,action:string,payload:Record<string,unknown>={}){
 const {data,error}=await db.rpc('website_lab',{p_action:action,p_payload:payload});
 if(error)throw error;return data;
}
