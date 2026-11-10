import Link from 'next/link';
import {redirect} from 'next/navigation';
import {labSession} from '@/lib/lab';
import AdminNavigation from '@/components/AdminNavigation';
import {adminCapabilities} from '@/lib/admin-capabilities';
import './admin.css';
export const dynamic='force-dynamic';
export const metadata={title:'Mettelo Administration',robots:{index:false,follow:false}};
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const {db,user}=await labSession();if(!user)redirect('/signin?next=%2Fadmin');
 const capabilities=await adminCapabilities();
 if(!capabilities||(!capabilities.operations&&!capabilities.news&&!capabilities.opportunities))return <main className="section"><div className="shell"><h1>Administrator access required</h1><p>Your account does not have website administration permission.</p><Link href="/member">Return to member home →</Link></div></main>;
 return <div className="adminWorkspace"><a className="skipMember" href="#admin-main">Skip to admin content</a><header className="adminHeader"><Link href="/admin" aria-label="Mettelo administration home"><img src="/mettelo-logo.svg" alt="Mettelo" width="144" height="31"/></Link><span>Administration</span><Link className="adminMemberLink" href="/member">Member home ↗</Link><form action="/auth/signout" method="post"><button>Sign out</button></form></header><AdminNavigation capabilities={capabilities}/><main id="admin-main" tabIndex={-1}>{children}</main><footer className="adminFooter">Mettelo administration · Restricted access · Staging preview</footer></div>;
}
