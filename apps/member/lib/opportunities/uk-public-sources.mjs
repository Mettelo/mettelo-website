import {XMLParser,XMLValidator} from 'fast-xml-parser';

export const UK_TECH_SEARCH_TERMS=['data','information','informatics','data governance','chief data','machine learning','business analyst','performance analyst','information analyst','analytics','artificial intelligence','digital','software','cyber','cloud'];
export const HOME_OFFICE_FEED='https://homeofficejobs.tal.net/vx/mobile-0/appcentre-2/brand-3/candidate/jobboard/vacancy/1/feed';
export const DWP_DIGITAL_JOBS='https://careers.dwp.gov.uk/all-digital-jobs/';
const nhsHosts=new Set(['www.jobs.nhs.uk','jobs.nhs.uk','beta.jobs.nhs.uk']);
const text=value=>String(value??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const list=value=>value==null?[]:Array.isArray(value)?value:[value];
function xmlDocument(xml){
 if(typeof xml!=='string'||Buffer.byteLength(xml)>2_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('Source returned invalid or oversized XML.');
 return new XMLParser({ignoreAttributes:false,parseTagValue:false,processEntities:false,removeNSPrefix:true}).parse(xml);
}
function date(value,endOfDay=false){const raw=text(value);if(!raw)return null;const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw+(endOfDay?'T23:59:59Z':'T00:00:00Z'):raw);return Number.isFinite(d.getTime())?d.toISOString():null;}
function officialUrl(value,hosts){try{const u=new URL(text(value));return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&hosts.has(u.hostname)?u.href:null;}catch{return null;}}
export function parseNhsFeed(xml,now=Date.now()){
 const doc=xmlDocument(xml);if(!Object.hasOwn(doc,'nhsJobs'))throw Error('NHS response did not contain a vacancy feed.');
 const jobs=list(doc.nhsJobs.vacancyDetails).flatMap(v=>{
  const url=officialUrl(v.url,nhsHosts),closesAt=date(v.closeDate,true),publishedAt=date(v.postDate);
  if(!url||!text(v.id)||!text(v.title)||!text(v.employer)||!publishedAt||!closesAt||Date.parse(closesAt)<=now)return [];
  return [{provider:'nhs',externalId:text(v.id),title:text(v.title),organisation:text(v.employer),description:text(v.description).slice(0,2000),location:list(v.locations?.location??v.locations?.locations).map(text).join('; ')||null,url,publishedAt,closesAt,remote:false,countryCode:'GB',opportunityType:'job',sourceOrganisation:'NHS Jobs'}];
 });
 return {jobs,totalPages:Math.max(1,Math.min(1000,Number(doc.nhsJobs.totalPages)||1))};
}
export function parseCivilServiceFeed(xml){
 const doc=xmlDocument(xml);if(!doc.feed)throw Error('Civil Service source did not return an Atom feed.');
 return list(doc.feed.entry).flatMap(v=>{
  const link=list(v.link).find(l=>l['@_rel']==='alternate')||list(v.link)[0];
  const url=officialUrl(link?.['@_href'],new Set(['homeofficejobs.tal.net']));const publishedAt=date(v.published||v.updated);
  if(!url||!publishedAt||!text(v.title))return [];
  return [{provider:'civilservice',externalId:text(v.id)||url,title:text(v.title),organisation:text(v.author?.name||doc.feed.author?.name)||'Home Office',description:text(v.summary?.['#text']??v.summary??v.content?.['#text']??v.content).slice(0,2000),location:null,url,publishedAt,closesAt:null,remote:false,countryCode:'GB',opportunityType:'job',sourceOrganisation:'Home Office Civil Service recruitment'}];
 });
}
async function fetchXml(url,fetcher){
 const response=await fetcher(url,{headers:{accept:'application/xml, application/atom+xml, text/xml','user-agent':'Mettelo public opportunity feed reader'},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error(`Official job feed returned ${response.status}`);
 if(Number(response.headers.get('content-length'))>2_000_000)throw Error('Job feed exceeds size limit.');
 if(!response.body)throw Error('Job feed was empty.');
 const reader=response.body.getReader();const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw Error('Job feed exceeds size limit.');chunks.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks).toString('utf8');
}
export async function fetchNhsJobs({fetcher=fetch,terms=UK_TECH_SEARCH_TERMS,maxPages=2}={}){
 const jobs=new Map();
 for(const keyword of terms){for(let page=1;page<=Math.min(2,maxPages);page++){
  const url=new URL('https://www.jobs.nhs.uk/api/v1/search_xml');url.search=new URLSearchParams({keyword,limit:'100',page:String(page),externalOnly:'true',sort:'publicationDate'}).toString();
  const result=parseNhsFeed(await fetchXml(url.href,fetcher));for(const job of result.jobs)jobs.set(job.externalId,job);
  if(page>=result.totalPages)break;
 }}
 return [...jobs.values()];
}
export async function fetchCivilServiceJobs({fetcher=fetch}={}){return parseCivilServiceFeed(await fetchXml(HOME_OFFICE_FEED,fetcher));}
// Department-maintained cards link straight to Civil Service Jobs. Do not invent posting dates.
export function parseDwpDigitalJobs(html,now=Date.now()){
 if(typeof html!=='string'||Buffer.byteLength(html)>2_000_000||!html.includes('job-card-size'))throw Error('DWP vacancy card structure unavailable.');
 const jobs=new Map();
 for(const match of html.matchAll(/<a\b[^>]*class=["'][^"']*\bjob-card-size\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const href=match[0].match(/href=["']([^"']+)["']/i)?.[1];
  const url=officialUrl(href,new Set(['www.civilservicejobs.service.gov.uk']));
  if(!url)continue;const u=new URL(url),id=u.searchParams.get('jcode');
  if(u.pathname!=='/csr/jobs.cgi'||!/^\d+$/.test(id||''))continue;
  const title=text(match[1].match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
  const paragraphs=[...match[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>text(m[1]));
  const raw=paragraphs.find(p=>/^Closing date:/i.test(p))?.replace(/^Closing date:\s*/i,'');
  const parts=raw?.match(/^(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/i);
  const month=parts&&['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(parts[2].toLowerCase());
  const closesAt=parts?new Date(Date.UTC(Number(parts[3]),Number(month),Number(parts[1]),23,59,59)).toISOString():null;
  if(!title||!closesAt||Date.parse(closesAt)<=now)continue;
  jobs.set(id,{provider:'civilservice',externalId:`csj-${id}`,title,organisation:'Department for Work and Pensions',description:paragraphs.filter(p=>!/^Closing date:/i.test(p)).join(' ').slice(0,2000),location:paragraphs[0]||null,url:u.href,publishedAt:null,closesAt,remote:false,countryCode:'GB',opportunityType:'job',sourceOrganisation:'DWP Digital · Civil Service Jobs'});
 }
 return [...jobs.values()];
}
export async function fetchDwpDigitalJobs({fetcher=fetch}={}){return parseDwpDigitalJobs(await fetchXml(DWP_DIGITAL_JOBS,fetcher));}
// Validate exact NHS reference against its official external-only feed, not HTML status alone.
export async function probeNhsVacancy(value,fetcher=fetch){
 const safe=officialUrl(value,nhsHosts);if(!safe)return null;
 const match=new URL(safe).pathname.match(/^\/candidate\/jobadvert\/([A-Za-z0-9-]+)\/?$/);if(!match)return {state:'skipped',reason:'Unrecognised NHS advert URL.'};
 try{
  const url=new URL('https://www.jobs.nhs.uk/api/v1/search_xml');url.search=new URLSearchParams({jobReference:match[1],externalOnly:'true',limit:'100'}).toString();
  const result=parseNhsFeed(await fetchXml(url.href,fetcher));const found=result.jobs.some(j=>new URL(j.url).pathname.replace(/\/$/,'')===new URL(safe).pathname.replace(/\/$/,''));
  return {state:found?'active':'absent_feed',status:200};
 }catch{return {state:'transient',reason:'NHS reference check could not complete.'};}
}
