// Official HMRC careers pages. All fetch destinations are fixed or same-origin allowlisted.
export const HMRC_SEARCH='https://careers.hmrc.gov.uk/jobs/search';
const origin='https://careers.hmrc.gov.uk';
function clean(value){return String(value??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}
function advertUrl(value){try{const u=new URL(value,origin);return u.origin===origin&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/jobs\/[a-z0-9-]+$/.test(u.pathname)&&u.pathname!=='/jobs/search'?u.href:null;}catch{return null;}}
function nextSearch(value){try{const u=new URL(value.replace(/&amp;/g,'&'),origin);return u.origin===origin&&u.pathname==='/jobs/search'&&[...u.searchParams.keys()].every(k=>k==='page')&&/^\d+$/.test(u.searchParams.get('page')||'')?u.href:null;}catch{return null;}}
export function parseHmrcSearch(html){
 if(typeof html!=='string'||!html.includes('block-job-search-results'))throw Error('HMRC search structure unavailable.');
 const urls=new Set();let next=null;
 for(const h of html.matchAll(/<h3\b[^>]*class=["'][^"']*job-search-results-card-title[^"']*["'][^>]*>([\s\S]*?)<\/h3>/gi)){
  const href=h[1].match(/href=["']([^"']+)["']/i)?.[1];const url=href&&advertUrl(href);if(!url)throw Error('HMRC vacancy link left its official board.');urls.add(url);
 }
 for(const a of html.matchAll(/<a\b[^>]*>/gi)){
  const href=a[0].match(/href=["']([^"']+)["']/i)?.[1];if(!href)continue;
  if(/\brel=["']next["']/i.test(a[0])){next=nextSearch(href);if(!next)throw Error('HMRC pagination left its official search.');}
 }
 return {urls:[...urls],next};
}
export function parseHmrcJob(html,url,now=Date.now()){
 const safe=advertUrl(url);if(!safe)throw Error('Unrecognised HMRC advert URL.');
 const postings=[];
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  let data;try{data=JSON.parse(m[1]);}catch{throw Error('Invalid HMRC structured job data.');}
  for(const item of [...(Array.isArray(data)?data:[data]),...(data?.['@graph']||[])])if(item?.['@type']==='JobPosting')postings.push(item);
 }
 if(postings.length!==1)throw Error('HMRC advert has no unique JobPosting.');
 const job=postings[0],id=String(job.identifier?.value||''),publishedAt=job.datePosted?new Date(job.datePosted):null;
 // HMRC validThrough can be a syndication expiry. The visible closing date governs applications.
 const closing=clean(html.match(/<span\b[^>]*id=["']closing_on_icon_text_[^"']+["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]);
 const parts=closing.match(/^Closing on:\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})$/i);
 const month=parts?['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(parts[1].toLowerCase()):-1;
 const deadline=parts?new Date(Date.UTC(Number(parts[3]),month,Number(parts[2]),23,59,59)):null;
 if(!/^[a-z0-9-]{1,100}$/i.test(id)||!clean(job.title)||!publishedAt||!Number.isFinite(publishedAt.getTime())||publishedAt.getTime()>now||!deadline||deadline.getUTCMonth()!==month||deadline.getUTCDate()!==Number(parts[2]))throw Error('HMRC advert lacks valid identity, posting date or applicant closing date.');
 if(!/^(HMRC|HM Revenue (?:and|&) Customs)$/i.test(clean(job.hiringOrganization?.name)))throw Error('Unexpected HMRC employer.');
 if(deadline.getTime()<=now)return null;
 return {provider:'civilservice',externalId:`hmrc-${id}`,title:clean(job.title),organisation:'HM Revenue and Customs',description:clean(job.description).slice(0,2000),location:(Array.isArray(job.jobLocation)?job.jobLocation:[job.jobLocation]).map(l=>clean(l?.address?.addressLocality)).filter(Boolean).join('; ')||null,url:safe,publishedAt:publishedAt.toISOString(),closesAt:deadline.toISOString(),remote:false,countryCode:'GB',opportunityType:'job',sourceOrganisation:'HMRC Careers · Civil Service'};
}
async function readPage(url,fetcher){
 const r=await fetcher(url,{redirect:'error',headers:{accept:'text/html','user-agent':'Mettelo public opportunity feed reader'},signal:AbortSignal.timeout(12000)});
 if(!r.ok||r.status!==200){await r.body?.cancel();const error=Error(r.status===202?'HMRC automated-request check: source temporarily unavailable.':`HMRC returned ${r.status}`);error.httpStatus=r.status;throw error;}
 if(!r.body||Number(r.headers.get('content-length'))>2_000_000)throw Error('HMRC response empty or oversized.');
 const reader=r.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw Error('HMRC response oversized.');chunks.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks).toString('utf8');
}
export async function fetchHmrcJobs({fetcher=fetch,maxPages=4}={}){
 const urls=new Set(),visited=new Set();let next=HMRC_SEARCH;
 for(let page=0;next&&page<Math.min(4,maxPages);page++){
  if(visited.has(next))throw Error('HMRC pagination repeated.');visited.add(next);
  const result=parseHmrcSearch(await readPage(next,fetcher));result.urls.forEach(u=>urls.add(u));next=result.next;
 }
 if(next||urls.size>100)throw Error('HMRC source exceeds this run’s page limit; coverage incomplete.');
 const queue=[...urls],jobs=[];
 await Promise.all(Array.from({length:Math.min(3,queue.length)},async()=>{while(queue.length){const url=queue.shift();const job=parseHmrcJob(await readPage(url,fetcher),url);if(job)jobs.push(job);}}));
 return jobs;
}
export async function probeHmrcVacancy(value,fetcher=fetch){
 if(!advertUrl(value))return null;
 try{const job=parseHmrcJob(await readPage(value,fetcher),value);return job?{state:'active',status:200}:{state:'transient',reason:'Advert deadline passed; run deadline expiry.'};}
 catch(error){return [404,410].includes(error.httpStatus)?{state:'missing',status:error.httpStatus}:{state:'transient',reason:'HMRC advert could not be validated.'};}
}
