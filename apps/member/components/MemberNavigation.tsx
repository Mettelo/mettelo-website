'use client';
import AppIcon from '@/components/AppIcon';
import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';

import Link from 'next/link';
import data from './navigation.snapshot.json';
import DismissibleDisclosure from './DismissibleDisclosure';
import {usePathname} from 'next/navigation';
const website=publicWebsiteOrigin();
const work=[{href:'/member',label:'Home',description:'Your next step',icon:"home"},{href:'/member/lab',label:'Mettelo Lab',description:'Applications and practical work',icon:"layers"},{href:'/member/portfolio',label:'My Portfolio',description:'Your work and evidence',icon:"file"}];
const discover=[{href:'/member/market',label:'Connect',description:'Discover and collaborate',icon:"people"},{href:website+'/projects/',label:'Projects',description:'Find a project',icon:"grid"},{href:'/opportunities',label:'Opportunities',description:'Explore roles',icon:'briefcase'}];
export default function MemberNavigation(){
 const path=usePathname();
 const active=(href:string)=>path===href||(href==='/member/lab'&&path==='/member/applications')||(href!=='/member'&&path.startsWith(href+'/'));
 const render=(item:typeof work[number])=><Link key={item.href} href={item.href} aria-current={active(item.href)?'page':undefined}><span className="workspaceNavMark" aria-hidden="true"><AppIcon name={item.icon}/></span><span><strong>{item.label}</strong><small>{item.description}</small></span></Link>;
 return <div className="workspaceNavigation"><nav className="workspaceDesktop" aria-label="Member navigation"><div className="workspaceSidebarTitle"><span>MY METTELO</span><strong>Member space</strong></div><section><h2>Your workspace</h2>{work.map(render)}</section><section><h2>Discover</h2>{discover.map(render)}</section><section><h2>Support &amp; resources</h2>{data.memberTools.map(item=>render({href:item.href,label:item.label,description:item.href==='/resources'?'Learning materials':'Your support requests',icon:item.icon==='book'?'book':'message'}))}</section><a className="workspacePublicLink" href={website}>Explore Mettelo</a></nav><nav className="workspaceBottom" aria-label="Member mobile navigation"><Link href="/member" aria-current={path==='/member'?'page':undefined}><span aria-hidden="true"><AppIcon name="home"/></span><small>Home</small></Link><Link href="/member/lab" aria-current={active('/member/lab')?'page':undefined}><span aria-hidden="true"><AppIcon name="layers"/></span><small>Lab</small></Link><Link href="/member/portfolio" aria-current={active('/member/portfolio')?'page':undefined}><span aria-hidden="true"><AppIcon name="file"/></span><small>Portfolio</small></Link><DismissibleDisclosure className="workspaceMore" key={path}><summary aria-label="More member navigation"><span aria-hidden="true"><AppIcon name="more"/></span><small>More</small></summary><div className="workspaceMorePanel"><h2>Explore your space</h2>{discover.map(render)}{data.memberTools.map(item=>render({href:item.href,label:item.label,description:'',icon:item.icon==='book'?'book':'message'}))}<a href={website}>Explore Mettelo</a></div></DismissibleDisclosure></nav></div>;
}
export function MemberBreadcrumb(){
 const path=usePathname();if(!path.startsWith('/member')&&path!=='/resources')return null;
 const current=path==='/resources'?'Resources':path.startsWith('/member/portfolio/examples')?'Portfolio examples':path.startsWith('/member/portfolio/shares')?'Shared portfolio links':path.startsWith('/member/market')?'Mettelo Connect':path.startsWith('/member/enquiries')?'My enquiries':(path.startsWith('/member/lab')||path==='/member/applications')?'Mettelo Lab':path==='/member/profile'?'My profile':path==='/member/account'?'Your account':work.find(item=>item.href===path)?.label||'Project application';
 return <nav className="memberBreadcrumb" aria-label="Breadcrumb"><Link href="/member">Member home</Link><span aria-hidden="true">/</span><span aria-current="page">{current}</span></nav>;
}
