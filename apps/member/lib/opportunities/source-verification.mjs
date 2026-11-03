import {probeNhsVacancy,fetchDwpDigitalJobs} from './uk-public-sources.mjs';
import {probeHmrcVacancy} from './hmrc-source.mjs';
import {probeCpsVacancy} from './cps-source.mjs';
import {probeWorkhubVacancy} from './workhub-source.mjs';
// Verify only known feed hosts. Employer URLs require a separately reviewed registry.
const allowedHosts=new Set(['homeofficejobs.tal.net','www.arbeitnow.com','arbeitnow.com','remotive.com','www.remotive.com','remotive.io','www.remotive.io']);
export function verifiedSourceUrl(value){
 try{const url=new URL(value);if(url.protocol!=='https:'||url.port||url.username||url.password||!allowedHosts.has(url.hostname))return null;return url.href;}catch{return null;}
}
export async function probeOpportunitySource(value,fetcher=fetch,sourceOrganisation=''){
 const workhub=await probeWorkhubVacancy(value,fetcher);if(workhub)return workhub;
 const cps=await probeCpsVacancy(value,fetcher);if(cps)return cps;
 const hmrc=await probeHmrcVacancy(value,fetcher);if(hmrc)return hmrc;
 if(sourceOrganisation==='DWP Digital · Civil Service Jobs'){
  try{
   const url=new URL(value);
   if(url.origin!=='https://www.civilservicejobs.service.gov.uk'||url.pathname!=='/csr/jobs.cgi'||!/^\d+$/.test(url.searchParams.get('jcode')||''))return {state:'skipped'};
   const jobs=await fetchDwpDigitalJobs({fetcher});
   return {state:jobs.some(j=>new URL(j.url).searchParams.get('jcode')===url.searchParams.get('jcode'))?'active':'absent_feed',status:200};
  }catch{return {state:'transient',reason:'DWP vacancy check could not complete.'};}
 }
 const nhsResult=await probeNhsVacancy(value,fetcher);if(nhsResult)return nhsResult;
 let target=verifiedSourceUrl(value);
 if(!target)return {state:'skipped',reason:'Source host is not in the reviewed registry.'};
 try{
  for(let redirects=0;redirects<=3;redirects++){
   let response=await fetcher(target,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(8000)});
   if(response.status===405)response=await fetcher(target,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(8000)});
   // Never download the response body for a listing availability check.
   await response.body?.cancel();
   if([301,302,303,307,308].includes(response.status)){
    const location=response.headers.get('location');
    const next=location&&verifiedSourceUrl(new URL(location,target).href);
    if(!next)return {state:'skipped',reason:'Redirect left the reviewed registry.'};
    target=next;continue;
   }
   if(response.status>=200&&response.status<300)return {state:'active',status:response.status};
   if(response.status===404||response.status===410)return {state:'missing',status:response.status};
   return {state:'transient',status:response.status};
  }
  return {state:'transient',reason:'Redirect limit reached.'};
 }catch{return {state:'transient',reason:'Source check did not complete.'};}
}
export function sourceCheckDecision(result,previousFailures=0){
 if(result.state==='active')return {expire:false,failures:0};
 if(result.state==='missing'||result.state==='absent_feed'){const failures=Math.max(0,previousFailures)+1;return {expire:failures>=2,failures};}
 // Blocked requests and unreviewed hosts are not evidence of a closed vacancy.
 return {expire:false,failures:Math.max(0,previousFailures)};
}
