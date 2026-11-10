import type {Metadata} from 'next';
import {publicRobots} from '@/lib/seo-policy.mjs';
import OpportunityBoard from '@/components/OpportunityBoard';
import {loadOpportunities} from '@/lib/opportunities';
import './opportunities.css';
import './opportunity-card-polish.css';
import './opportunity-mobile-filters.css';
import './opportunity-accessibility-reflow.css';
import './website-opportunities.css';
export const metadata:Metadata={title:'Data, AI & Technology Job Board | Mettelo',description:'Explore jobs, internships and graduate roles in Data, AI and Technology. Check eligibility and apply with the original employer.',alternates:{canonical:'https://mettelo.com/opportunities'},robots:publicRobots()};
export const dynamic='force-dynamic';
export default async function OpportunitiesPage(){
  const {items,unavailable}=await loadOpportunities();
  return <div className="websiteOpportunities"><section className="opportunityHero"><div className="shell opportunityHeroInner"><div className="opportunityHeroCopy"><div className="eyebrow">Data, AI & Technology Job Board</div><h1>Find your next role.</h1><p className="opportunityHeroLead">Find current jobs, internships, graduate roles and fellowships with clearer context on location, remote work, eligibility and sponsorship.</p><a href="/member">My Mettelo →</a></div></div></section><section className="opportunityDiscovery"><div className="shell"><h2>Search the opportunity board.</h2><p>Search by role, company, skill or location. Check the official listing before applying. Mettelo does not receive or track external employer applications.</p>{unavailable?<div className="panel" role="status"><h3>Opportunity data is temporarily unavailable.</h3><p>Try again shortly. This does not mean there are no opportunities.</p><a href="/opportunities">Try again</a></div>:items.length?<OpportunityBoard items={items}/>:<div className="panel"><h3>No matching opportunities are listed right now.</h3><p>This feed shows published, public listings with current closing dates. Please check back later.</p></div>}</div></section></div>;
}
