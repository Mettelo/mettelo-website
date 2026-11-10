import AuthAccountClient from './AuthAccountClient';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {safeMemberPath} from '@/lib/auth-navigation.mjs';
import './signin.css';
export default async function SignIn({searchParams}:{searchParams:Promise<{mode?:string;next?:string}>}){
 const {mode,next}=await searchParams;const initialMode=mode==='signup'||mode==='reset'?mode:'signin';
 if(initialMode!=='reset'){const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();if(user?.email_confirmed_at)redirect(safeMemberPath(next));}
 return <AuthAccountClient memberCount={null} initialMode={initialMode}/>;
}
