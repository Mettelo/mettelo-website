'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import type {AdminCapabilities} from '@/lib/admin-capabilities';
export default function AdminNavigation({capabilities:c}:{capabilities:AdminCapabilities}){
 const path=usePathname();const links=[{href:'/admin',label:'Overview'},...(c.operations?[{href:'/admin/members',label:'Members'},{href:'/admin/projects',label:'Project teams'},{href:'/admin/support',label:'Support inbox'}]:[]),...(c.news?[{href:'/admin/news',label:'Industry News'}]:[]),...(c.opportunities?[{href:'/admin/opportunities',label:'Opportunity pipeline'}]:[])];
 return <nav className="adminNavigation" aria-label="Administrator navigation">{links.map(link=><Link key={link.href} href={link.href} aria-current={(path===link.href||(link.href!=='/admin'&&path.startsWith(link.href+'/')))?'page':undefined}>{link.label}</Link>)}</nav>;
}
