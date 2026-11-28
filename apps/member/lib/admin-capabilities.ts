import 'server-only';
import {labSession} from './lab';
export type AdminCapabilities={role:string;operations:boolean;news:boolean;publish:boolean;roles:boolean;opportunities:boolean};
export const roleLabels:Record<string,string>={member:'Member',writer:'Writer',editor:'Editor',operations_admin:'Operations admin',full_admin:'Full admin'};
export async function adminCapabilities(){const {db,user}=await labSession();if(!user)return null;const {data,error}=await db.rpc('website_admin_capabilities');return error?null:data as AdminCapabilities;}
