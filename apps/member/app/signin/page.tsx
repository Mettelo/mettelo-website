import AuthAccountClient from './AuthAccountClient';
import './signin.css';
export default async function SignIn({searchParams}:{searchParams:Promise<{mode?:string}>}){const {mode}=await searchParams;const initialMode=mode==='signup'||mode==='reset'?mode:'signin';return <AuthAccountClient memberCount={null} initialMode={initialMode}/>;}
