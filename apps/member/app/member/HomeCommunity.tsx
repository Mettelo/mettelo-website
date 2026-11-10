import {communityRpc,type CommunityPost} from '@/lib/market-community';
import type {createServerSupabaseClient} from '@/lib/supabase/server';
import styles from './member-home.module.css';

export default async function HomeCommunity({db}:{db:Awaited<ReturnType<typeof createServerSupabaseClient>>}){
 let posts:CommunityPost[]=[];
 try{const result=await communityRpc(db,'feed',{view:'all',category:'all'});posts=Array.isArray(result?.rows)?result.rows.slice(0,2):[];}catch{return null;}
 if(!posts.length)return null;
 return <section className={styles.community} aria-labelledby="home-community-title">
  <header><h2 id="home-community-title">Latest from the community</h2><a href="/member/market">View community →</a></header>
  <div>{posts.map(post=>{
   const metadata=post.entry_type==='project'||post.entry_type==='proposal';
   const href=post.entry_type==='project'?'/member/market/projects/'+encodeURIComponent(post.source_id||post.id):post.entry_type==='proposal'?'/member/market?category=projects':'/member/market/community?post='+encodeURIComponent(post.id);
   const label=metadata||post.kind==='project'?'Project':post.kind==='idea'?'Idea':post.kind==='collaborators'?'Seeking collaborators':post.kind==='question'?'Question':post.kind==='showcase'?'Showcase':'Update';
   const date=new Date(post.created_at),valid=Number.isFinite(date.getTime());
   return <a className={styles.communityItem} href={href} key={post.id}><span className={styles.communityType}>{label}</span><p>{post.title||post.body}</p><small>{post.author}{valid&&<> · <time dateTime={date.toISOString()}>{new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'}).format(date)}</time></>}</small><span className={styles.communityArrow} aria-hidden="true">↗</span></a>;
  })}</div>
 </section>;
}
