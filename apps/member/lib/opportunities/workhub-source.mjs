// GOV.UK /find-a-job links to Work Hub. Only exact GRS employer records qualify here.
const origin='https://www.jobs.service.gov.uk';
export const WORKHUB_SOURCE='Work Hub · Civil Service (GRS)';
export const WORKHUB_TERMS=['data','information','analytics','artificial intelligence','machine learning','business analyst','digital','software','cyber'];
const clean=value=>String(value??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;|&#160;/g,' ').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
export function workhubAdvertUrl(value){try{const u=new URL(value,origin);return u.origin===origin&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/jobs\/[a-f0-9]{24}$/.test(u.pathname)?u.href:null;}catch{return null;}}
export function parseWorkhubSearch(html){
 if(typeof html!=='string'||!html.includes('Showing results'))throw Error('Work Hub search structure unavailable.');
 const urls=new Set();
 for(const card of html.split(/<div\b[^>]*data-testid="searchResultCard-[a-f0-9]{24}"[^>]*>/).slice(1)){
  const employer=clean(card.match(/data-testid="searchResultCardEmployer">\s*<span>([\s\S]*?)<\/span>/)?.[1]);
  if(employer!=='Government Recruitment Service')continue;
  const url=workhubAdvertUrl(card.match(/href="([^\"]+)"/)?.[1]);
  if(!url)throw Error('Work Hub vacancy identity unavailable.');urls.add(url);
 }
 return [...urls];
}
function date(value,end=false){
 const parts=clean(value).match(/^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/i);
 if(!parts)return null;
 const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(parts[2].toLowerCase());
 const d=new Date(Date.UTC(+parts[3],month,+parts[1],end?23:0,end?59:0,end?59:0));
 return d.getUTCMonth()===month&&d.getUTCDate()===+parts[1]?d.toISOString():null;
}
export function workhubOpportunityType(title){return /\bgraduate\b/i.test(title)?'graduate':/\bapprentice(?:ship)?\b/i.test(title)?'apprenticeship':/\bintern(?:ship)?\b/i.test(title)?'internship':'job';}
export function parseWorkhubJob(html,url,now=Date.now()){
 const safe=workhubAdvertUrl(url);if(!safe)throw Error('Unreviewed Work Hub advert URL.');
 const field=name=>clean(html.match(new RegExp('<td\\b[^>]*data-testid="'+name+'"[^>]*>([\\s\\S]*?)<\\/td>'))?.[1]);
 if(field('companyName')!=='Government Recruitment Service')throw Error('Work Hub employer is not Government Recruitment Service.');
 const title=clean(html.match(/<h1\b[^>]*data-testid="pageHeading"[^>]*>([\s\S]*?)<\/h1>/)?.[1]);
 const publishedAt=date(field('postingDate')),closesAt=date(field('closingDate'),true);
 if(!title||!publishedAt||!closesAt||Date.parse(publishedAt)>now||Date.parse(closesAt)<Date.parse(publishedAt))throw Error('Work Hub advert lacks valid title or dates.');
 if(Date.parse(closesAt)<=now)return null;
 const summary=html.match(/<h2\b[^>]*>Summary<\/h2>\s*<div class="rawHtmlContainer">([\s\S]*?)<\/div>/)?.[1];
 if(!summary)throw Error('Work Hub summary unavailable.');
 const opportunityType=workhubOpportunityType(title);
 return {provider:'civilservice',externalId:`workhub-${new URL(safe).pathname.split('/').pop()}`,title,organisation:'Government Recruitment Service',description:clean(summary).slice(0,2000),location:field('location')||null,url:safe,publishedAt,closesAt,remote:false,countryCode:'GB',opportunityType,sourceOrganisation:WORKHUB_SOURCE};
}
export function workhubCivilServiceIdentity(html){
 const ids=new Set();
 for(const match of html.matchAll(/href="([^\"]+)"/g)){
  let u;try{u=new URL(match[1].replace(/&amp;/g,'&'));}catch{continue;}
  if(u.origin!=='https://www.civilservicejobs.service.gov.uk'||u.username||u.password||u.pathname!=='/csr/jobs.cgi')continue;
  const id=u.searchParams.get('vxvac'),jcode=u.searchParams.get('jcode');
  if(/^\d+$/.test(id||''))ids.add(`vxvac-${id}`);
  else if(/^\d+$/.test(jcode||''))ids.add(`jcode-${jcode}`);
 }
 if(ids.size===0)return null;
 if(ids.size!==1)throw Error('Work Hub advert has ambiguous Civil Service application identities.');
 return [...ids][0];
}
async function read(url,fetcher){
 const r=await fetcher(url,{redirect:'error',headers:{accept:'text/html','user-agent':'Mettelo public opportunity feed reader'},signal:AbortSignal.timeout(12000)});
 if(r.status!==200){await r.body?.cancel();const e=Error(`Work Hub returned ${r.status}`);e.httpStatus=r.status;throw e;}
 if(!r.body||Number(r.headers.get('content-length'))>2_000_000)throw Error('Work Hub response empty or oversized.');
 const reader=r.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw Error('Work Hub response oversized.');chunks.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks).toString('utf8');
}
export function workhubHasNextPage(html,keyword,page){
 return [...html.matchAll(/href="([^\"]+)"/g)].some(match=>{
  try{const u=new URL(match[1].replace(/&amp;/g,'&'),origin);return u.origin===origin&&u.pathname==='/jobs/search'&&u.searchParams.get('keywords')===keyword&&u.searchParams.get('pageNumber')===String(page+1);}catch{return false;}
 });
}
export function mergeWorkhubJobs(jobs){
 const unique=new Map();
 for(const job of [...jobs].sort((a,b)=>a.url.localeCompare(b.url))){
  const existing=unique.get(job.externalId);
  if(existing){existing.location=[...new Set([existing.location,job.location].filter(Boolean).flatMap(value=>value.split('; ')))].join('; ');continue;}
  unique.set(job.externalId,{...job});
 }
 return [...unique.values()];
}
export async function scanWorkhubBatch({fetcher=fetch,cursor={term:0,page:1},pageBudget=3}={}){
 if(!Number.isInteger(cursor.term)||cursor.term<0||cursor.term>WORKHUB_TERMS.length||!Number.isInteger(cursor.page)||cursor.page<1||cursor.page>1000)throw Error('Invalid Work Hub scan cursor.');
 let term=cursor.term,page=cursor.page;const jobs=[],pages=[];
 for(let count=0;count<Math.max(1,Math.min(5,pageBudget))&&term<WORKHUB_TERMS.length;count++){
  const keyword=WORKHUB_TERMS[term],url=new URL('/jobs/search',origin);url.search=new URLSearchParams({keywords:keyword,pageNumber:String(page)}).toString();
  const html=await read(url.href,fetcher),urls=parseWorkhubSearch(html);
  for(const advert of urls){const job=parseWorkhubJob(await read(advert,fetcher),advert);if(!job)continue;const identity=workhubCivilServiceIdentity(await read(advert+'/before-you-apply',fetcher));if(identity)jobs.push({...job,externalId:`workhub-${identity}`});}
  pages.push({keyword,page,grsLocationAdverts:urls.length});
  if(workhubHasNextPage(html,keyword,page))page++;else{term++;page=1;}
 }
 return {jobs:mergeWorkhubJobs(jobs),pages,cursor:{term,page},complete:term===WORKHUB_TERMS.length};
}
export async function fetchWorkhubJobs({fetcher=fetch,terms=WORKHUB_TERMS,maxPages=3}={}){
 const urls=new Set();
 // This is explicitly a bounded search, not complete nationwide department coverage.
 for(const keyword of terms){for(let page=1;page<=Math.max(1,Math.min(3,maxPages));page++){
  const url=new URL('/jobs/search',origin);url.search=new URLSearchParams({keywords:keyword,pageNumber:String(page)}).toString();
  const html=await read(url.href,fetcher);parseWorkhubSearch(html).forEach(value=>urls.add(value));
  if(!workhubHasNextPage(html,keyword,page))break;
 }}
 if(urls.size>100)throw Error('Work Hub advert limit exceeded; narrow the run.');
 const queue=[...urls].sort(),jobs=[];
 await Promise.all(Array.from({length:Math.min(3,queue.length)},async()=>{while(queue.length){const url=queue.shift(),job=parseWorkhubJob(await read(url,fetcher),url);if(job){
  const identity=workhubCivilServiceIdentity(await read(url+'/before-you-apply',fetcher));
  if(identity)jobs.push({...job,externalId:`workhub-${identity}`});
 }}}));
 // GRS may post one vacancy in several cities. Deduplicate using the actual CSJ ID.
 const unique=new Map();
 for(const job of jobs.sort((a,b)=>a.url.localeCompare(b.url))){
  const existing=unique.get(job.externalId);
  if(existing){existing.location=[...new Set([existing.location,job.location].filter(Boolean))].join('; ');continue;}
  unique.set(job.externalId,job);
 }
 return [...unique.values()];
}
export async function probeWorkhubVacancy(value,fetcher=fetch){
 const url=workhubAdvertUrl(value);if(!url)return null;
 try{const job=parseWorkhubJob(await read(url,fetcher),url);return job?{state:'active',status:200}:{state:'transient',reason:'Deadline passed; use deadline expiry.'};}
 catch(e){return [404,410].includes(e.httpStatus)?{state:'missing',status:e.httpStatus}:{state:'transient',reason:'Work Hub advert could not be validated.'};}
}
