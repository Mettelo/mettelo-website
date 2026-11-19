import {communityRpc,type CommunityPost} from '@/lib/market-community';
import type {createServerSupabaseClient} from '@/lib/supabase/server';
import AppIcon from '@/components/AppIcon';
import MarketAvatar from '@/components/MarketAvatar';
import styles from './member-home.module.css';
export function HomeCommunityView({posts=[],failed=false,showAction=true}:{posts?:CommunityPost[];failed?:boolean;showAction?:boolean}){
 return <section className={styles.community} aria-labelledby="home-community-title"><header><h2 id="home-community-title">From Mettelo Connect</h2>{showAction&&<a href="/member/market">Open Connect<AppIcon name="forward" size={16}/></a>}</header>
 {failed?<p className={styles.communityEmpty} role="status">Community updates are unavailable. Open Connect to try again.</p>:!posts.length?<p className={styles.communityEmpty}>No recent posts yet. Start a conversation in Connect.</p>:posts.slice(0,2).map(post=>{
 const metadata=post.entry_type==='project'||post.entry_type==='proposal';
 const href=post.entry_type==='project'?'/member/market/projects/'+encodeURIComponent(post.source_id||post.id):post.entry_type==='proposal'?'/member/market?category=projects':'/member/market/community?post='+encodeURIComponent(post.id);
 const label=metadata||post.kind==='project'?'Project':post.kind==='idea'?'Idea':post.kind==='collaborators'?'Seeking collaborators':post.kind==='question'?'Question':post.kind==='showcase'?'Showcase':'Update';
 const date=new Date(post.created_at),valid=Number.isFinite(date.getTime());
 return <a className={styles.communityItem} href={href} key={post.id}><span className={styles.communityIdentity}><MarketAvatar memberId={post.author_id} name={post.author||'Member'} className={styles.communityAvatar}/><span><strong>{post.author||'Member'}</strong><small>{label}{valid&&<> · <time dateTime={date.toISOString()}>{new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'}).format(date)}</time></>}</small></span><AppIcon name="forward" size={16}/></span><p>{post.title||post.body}</p></a>;
 })}</section>;
}
export function HomeCommunityLoading(){return <section className={styles.community} aria-busy="true" aria-label="Community updates loading"><h2>From Mettelo Connect</h2><p className={styles.loadingText} role="status">Loading recent posts…</p><div className={styles.communityLoading} aria-hidden="true"/></section>;}
export default async function HomeCommunity({db,showAction=true}:{db:Awaited<ReturnType<typeof createServerSupabaseClient>>;showAction?:boolean}){
 try{const result=await communityRpc(db,'feed',{view:'all',category:'all'});return Array.isArray(result?.rows)?<HomeCommunityView posts={result.rows} showAction={showAction}/>:<HomeCommunityView failed showAction={showAction}/>;}catch{return <HomeCommunityView failed showAction={showAction}/>;}
}
