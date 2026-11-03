import Link from 'next/link';
import {safeOpportunityLink} from '@/lib/opportunity-links.mjs';
import {redirect} from 'next/navigation';
import SaveOpportunityButton from '@/components/SaveOpportunityButton';
import {createServerSupabaseClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
type Listing={id:string;title:string;organisation:string|null;location:string|null;closes_at:string|null;official_application_url:string|null;source_url:string|null};
export default async function SavedOpportunities(){
 const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();
 if(!user?.email_confirmed_at)redirect('/signin?next=%2Fmember%2Fsaved-opportunities');
 const {data,error}=await db.from('saved_opportunities').select('opportunity_id,saved_at').eq('user_id',user.id).order('saved_at',{ascending:false});
 const ids=(data||[]).map(row=>row.opportunity_id);
 const listingResult=ids.length?await db.from('opportunities').select('id,title,organisation,location,closes_at,official_application_url,source_url').in('id',ids):{data:[],error:null};
 const unavailable=Boolean(error||listingResult.error);
 const listings=new Map((listingResult.data as Listing[]||[]).map(item=>[item.id,item]));
 return <section className="section memberCollection"><div className="shell"><header className="collectionHeader"><div><div className="eyebrow">My Mettelo · Your shortlist</div><h1>Saved opportunities</h1><p>Keep promising roles together and return when you are ready.</p></div><Link className="button dark" href="/opportunities">Browse opportunities →</Link></header><p className="collectionNotice">Saving a role does not apply for it or subscribe you to reminders.</p>{unavailable?<div className="panel collectionEmpty" role="alert"><h2>Your saved list could not be loaded.</h2><p>Your saved roles have not been changed. Refresh and try again.</p><a className="button ghost" href="/member/saved-opportunities">Reload shortlist</a></div>:data?.length?<div className="collectionList" aria-label="Your saved roles">{data.map(row=>{
  const item=listings.get(row.opportunity_id);const apply=item&&(safeOpportunityLink(item.official_application_url)||safeOpportunityLink(item.source_url));const closed=Boolean(item?.closes_at&&Date.parse(item.closes_at)<=Date.now());
  return <article className="panel collectionCard" key={row.opportunity_id} aria-labelledby={`saved-${row.opportunity_id}`}><span className="collectionBadge">{!item?'Listing unavailable':closed?'Closed':'Saved role'}</span><h2 id={`saved-${row.opportunity_id}`}>{item?<>{apply?<a href={apply} target="_blank" rel="noopener noreferrer">{item.title}</a>:item.title}</>:'This listing is no longer public.'}</h2>{item&&<p>{item.organisation||'Organisation not stated'}{item.location?` · ${item.location}`:''}</p>}<p>{!item?'The listing may have been withdrawn or changed. You can still remove it from your saved list.':closed?'The published closing date has passed.':'Check the official listing before applying.'}</p><p className="tinyNote">Saved {new Date(row.saved_at).toLocaleDateString('en-GB')}</p><div className="collectionActions">{apply&&!closed&&<a className="button dark" href={apply} target="_blank" rel="noopener noreferrer">Apply on source website ↗</a>}<SaveOpportunityButton opportunityId={row.opportunity_id} initialSaved/></div></article>;
 })}</div>:<div className="panel collectionEmpty"><div className="eyebrow">Keep your next move in view</div><h2>Build your opportunity shortlist.</h2><p>Explore opportunities and select Save role on anything worth returning to. Your saved roles will appear here.</p><Link className="button dark" href="/opportunities">Browse opportunities</Link></div>}</div></section>;
}
