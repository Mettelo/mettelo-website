export const CPS_CAREERS='https://www.cps.gov.uk/careers-crown-prosecution-service';
const origin='https://www.cps.gov.uk';
const clean=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
export function cpsAdvertUrl(value){try{const u=new URL(value,origin);const path=decodeURIComponent(u.pathname).replace(/^\/index\.php/,'');return u.origin===origin&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/career\/[a-z0-9-]+$/.test(path)?origin+path:null;}catch{return null;}}
export function parseCpsCards(html,now=Date.now()){
 if(typeof html!=='string'||!html.includes('teaser--career'))throw Error('CPS vacancy board structure unavailable.');
 return html.split(/<div\s+class="teaser teaser--career">/).slice(1).flatMap(card=>{
  const link=card.match(/<a\b[^>]*href="([^"]+)"[^>]*class="teaser__link"[^>]*>([\s\S]*?)<\/a>/i),url=link&&cpsAdvertUrl(link[1]);
  const raw=card.match(/<time\b[^>]*datetime="([^"]+)"/i)?.[1];const day=raw?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const deadline=day?new Date(day+'T23:59:59Z'):null;
  if(!url||!deadline||!Number.isFinite(deadline.getTime())||deadline.toISOString().slice(0,10)!==day)throw Error('CPS card identity or deadline unavailable.');
  if(deadline.getTime()<=now)return [];
  const field=name=>clean(card.match(new RegExp(name+':<\\/div>\\s*<p>([\\s\\S]*?)<\\/p>','i'))?.[1]);
  return [{title:clean(link[2]),url,closesAt:deadline.toISOString(),location:field('Location')||null,profession:field('Profession')}];
 });
}
export function parseCpsJob(html,card){
 const apply=html.match(/class="career-opportunity__apply-link"[^>]*>\s*<a\b[^>]*href="([^"]+)"/i)?.[1];
 let applyUrl;try{applyUrl=new URL((apply||'').replace(/&amp;/g,'&'));}catch{throw Error('CPS application link unavailable.');}
 if(applyUrl.protocol!=='https:'||applyUrl.username||applyUrl.password||applyUrl.port||!['www.cps.gov.uk','www.civilservicejobs.service.gov.uk'].includes(applyUrl.hostname))throw Error('Unreviewed CPS application destination.');
 // Link to the stable official CPS advert, avoiding short-lived Civil Service search SID links.
 return {provider:'civilservice',externalId:`cps-${new URL(card.url).pathname.split('/').pop()}`,title:card.title,organisation:'Crown Prosecution Service',description:`${card.title}. Profession: ${card.profession}. Read the official advert for eligibility and application details.`,location:card.location,url:card.url,publishedAt:null,closesAt:card.closesAt,remote:false,countryCode:'GB',opportunityType:'job',sourceOrganisation:'CPS Careers · Civil Service'};
}
async function read(url,fetcher){
 const r=await fetcher(url,{headers:{accept:'text/html','user-agent':'Mettelo public opportunity feed reader'},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!r.ok||r.status!==200){await r.body?.cancel();const e=Error(`CPS returned ${r.status}`);e.httpStatus=r.status;throw e;}
 if(!r.body||Number(r.headers.get('content-length'))>2_000_000)throw Error('CPS response empty or oversized.');
 const reader=r.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw Error('CPS response oversized.');chunks.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks).toString('utf8');
}
export async function fetchCpsJobs({fetcher=fetch}={}){
 const cards=parseCpsCards(await read(CPS_CAREERS,fetcher));if(cards.length>50)throw Error('CPS board exceeds this run’s limit.');
 const queue=[...cards],jobs=[];
 await Promise.all(Array.from({length:Math.min(2,queue.length)},async()=>{while(queue.length){const card=queue.shift();jobs.push(parseCpsJob(await read(card.url,fetcher),card));}}));
 return jobs;
}
export async function probeCpsVacancy(value,fetcher=fetch){
 if(!cpsAdvertUrl(value))return null;
 try{const html=await read(cpsAdvertUrl(value),fetcher);if(!/Applications are open until/.test(clean(html)))return {state:'transient',reason:'CPS application status unavailable.'};
  parseCpsJob(html,{url:cpsAdvertUrl(value)});return {state:'active',status:200};
 }catch(e){return [404,410].includes(e.httpStatus)?{state:'missing',status:e.httpStatus}:{state:'transient',reason:'CPS check could not complete.'};}
}
