'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef} from 'react';
import type {AdminCapabilities} from '@/lib/admin-capabilities';
export default function AdminNavigation({capabilities:c}:{capabilities:AdminCapabilities}){
 const path=usePathname();const links=[{href:'/admin',label:'Overview'},...(c.operations?[{href:'/admin/members',label:'Members'},{href:'/admin/project-library',label:'Projects'},{href:'/admin/projects',label:'Project teams'},{href:'/admin/support',label:'Support inbox'}]:[]),...(c.roles?[{href:'/admin/website',label:'Content & SEO'}]:[]),...(c.news?[{href:'/admin/news',label:'Industry News'}]:[]),...(c.opportunities?[{href:'/admin/opportunities',label:'Opportunity pipeline'}]:[])];
 const navigation=useRef<HTMLElement>(null);
 useEffect(()=>{if(window.matchMedia('(max-width:700px)').matches)navigation.current?.querySelector('[aria-current="page"]')?.scrollIntoView({block:'nearest',inline:'nearest'});},[path]);
 return <nav ref={navigation} className="adminNavigation" aria-label="Administrator navigation">{links.map(link=><Link key={link.href} href={link.href} aria-current={(path===link.href||(link.href!=='/admin'&&path.startsWith(link.href+'/')))?'page':undefined}>{link.label}</Link>)}</nav>;
}
