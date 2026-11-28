import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import AppIcon from '@/components/AppIcon';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import './resources.css';

export const metadata:Metadata={title:'Resources | My Mettelo',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';

const groups=[
 {id:'learning',label:'Learning',icon:'book',items:[
  {title:'Workshop recordings',source:'YouTube',detail:'Catch up on previous Mettelo workshops and revisit practical demonstrations.',action:'Watch workshops',href:'https://www.youtube.com/@Officialmettelo'},
 ]},
 {id:'career',label:'Career',icon:'briefcase',items:[
  {title:'Career resource library',source:'OneDrive',detail:'Find CV templates, interview and application toolkits, data learning pathways and project documentation templates. OneDrive may require separate access.',action:'Open career library',href:'https://1drv.ms/f/c/da3aa7b1d9999396/IgDj9KMf7GDaSqBXqX6uwbNZATwEB_HxJ4g7Yg_2vC2dI_Q?e=HDZUPE'},
  {title:'UK Global Talent and immigration guides',source:'Mettelo Resource Hub',detail:'Five free guides covering Global Talent in Digital Technology, Arts & Culture, and Academia & Research, plus the Innovator Founder visa and Nigerian passport renewal in the UK. Educational material only. For current requirements, consult the official guidance.',action:'Open the five guides',href:'https://mettelo.github.io/mettelo-resource-hub/'},
 ]},
 {id:'contribute',label:'Contribute',icon:'layers',items:[
  {title:'Mettelo on GitHub',source:'GitHub',detail:'Browse Mettelo’s GitHub organisation, public repositories and technical contributions.',action:'Explore GitHub',href:'https://github.com/Mettelo'},
  {title:'Volunteer for a workshop',source:'OneDrive',detail:'Register your interest in helping with or leading a Mettelo workshop.',action:'Open volunteer sheet',href:'https://1drv.ms/x/c/da3aa7b1d9999396/IQCU0ZSkkkEVSLu58ZoZK-a1AYcq7zWpKRaK8VLILHjIRN0?e=kBfeT0'},
 ]},
 {id:'community',label:'Community',icon:'people',items:[
  {title:'Mettelo on LinkedIn',source:'LinkedIn',detail:'Follow Mettelo updates and share them with your professional network.',action:'Open LinkedIn',href:'https://linkedin.com/company/officialmettelohq'},
  {title:'Mettelo on Instagram',source:'Instagram',detail:'See workshop and community highlights.',action:'Open Instagram',href:'https://instagram.com/officialmettelo'},
  {title:'Mettelo on Facebook',source:'Facebook',detail:'Follow the official Mettelo Facebook page.',action:'Open Facebook',href:'https://facebook.com/officialmettelo'},
  {title:'Mettelo on X',source:'X',detail:'Follow announcements from the official Mettelo account.',action:'Open X',href:'https://x.com/officialmettelo'},
 ]},
] as const;

function resourcesUrl(category:string,query:string){
 const params=new URLSearchParams();
 if(category)params.set('category',category);
 if(query)params.set('q',query);
 return params.size?'/resources?'+params.toString():'/resources';
}

export default async function ResourcesPage({searchParams}:{searchParams:Promise<{category?:string|string[];q?:string|string[]}>}){
 const params=await searchParams;
 const query=typeof params.q==='string'?params.q.trim().slice(0,100):'';
 const category=groups.find(group=>group.id===params.category)?.id||'';
 const db=await createServerSupabaseClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/signin?'+new URLSearchParams({next:resourcesUrl(category,query)}));
 if(!user.email_confirmed_at)redirect('/auth/check-email');

 const words=query.toLowerCase().split(/\s+/).filter(Boolean);
 const results=groups.filter(group=>!category||group.id===category).map(group=>({
  ...group,
  items:group.items.filter(item=>words.every(word=>[group.label,item.title,item.source,item.detail].join(' ').toLowerCase().includes(word))),
 })).filter(group=>group.items.length);

 const count=results.reduce((total,group)=>total+group.items.length,0);

 return <div className="resourceLibrary">
  <header className="resourceHero">
   <span className="resourceHeroIcon"><AppIcon name="book" size={24}/></span>
   <div><h1>Resources</h1><p>Find Mettelo workshops, career materials and official community channels in one place.</p></div>
  </header>
  <form className="resourceSearch" action="/resources" method="get" role="search" key={resourcesUrl(category,query)}>
   {category&&<input type="hidden" name="category" value={category}/>}
   <label htmlFor="resource-query">Search resources</label>
   <div><input id="resource-query" name="q" type="search" defaultValue={query} maxLength={100} placeholder="e.g. workshops, GitHub"/><button type="submit">Search</button></div>
  </form>
  <nav className="resourceFilters" aria-label="Resource categories">
   {[{id:'',label:'All resources'},...groups].map(group=><Link key={group.id} href={resourcesUrl(group.id,query)} aria-current={category===group.id?'page':undefined}>{group.label}</Link>)}
  </nav>
  {query&&<div className="resourceResults"><p>{count} {count===1?'result':'results'} for <strong>{query}</strong></p><Link href={resourcesUrl(category,'')}>Clear search</Link></div>}
  {!results.length&&<div className="resourceEmpty"><h2>No matching resources</h2><p>Try a different search or browse all categories.</p><Link href="/resources">Show all resources</Link></div>}
  {results.map(group=><section className="resourceGroup" key={group.id} aria-labelledby={`resources-${group.id}`}>
   <h2 id={`resources-${group.id}`}><AppIcon name={group.icon}/>{group.label}</h2>
   <ul className="resourceGrid">{group.items.map(item=><li key={item.href}>
    <span className="resourceProvider">{item.source}</span><h3>{item.title}</h3><p>{item.detail}</p>
    <a href={item.href}>{item.action} <span aria-hidden="true">&#8599;</span></a>
   </li>)}</ul>
  </section>)}
  <aside className="resourceHelp"><div><h2>Need help opening a resource?</h2><p>External services manage their own permissions. Contact Mettelo if a resource is unavailable.</p></div><Link href="/member/enquiries">Get support</Link></aside>
 </div>;
}
