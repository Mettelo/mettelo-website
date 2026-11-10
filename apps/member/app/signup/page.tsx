import {redirect} from 'next/navigation';
import {safeMemberPath} from '@/lib/auth-navigation.mjs';
export default async function SignUp({searchParams}:{searchParams:Promise<{next?:string}>}){const {next}=await searchParams;redirect('/signin?mode=signup'+(next?'&next='+encodeURIComponent(safeMemberPath(next)):''));}
