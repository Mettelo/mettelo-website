// Read-only evaluation. Never call the publication pipeline from here.
export const ADZUNA_TEST_TERMS=['data engineer','data analyst','information governance','artificial intelligence','business analyst','data architect','cyber security','digital government'];
const employers=['Government Recruitment Service','Department for Work and Pensions','DWP','HM Revenue and Customs','HMRC','Home Office','Ministry of Justice','Office for National Statistics','Government Digital Service','Department for Transport','Department for Education','Ministry of Defence','Department for Science Innovation and Technology','Department for Environment Food and Rural Affairs','Cabinet Office','Crown Prosecution Service','Insolvency Service','FCDO Services','HM Land Registry'];
const normalise=value=>String(value??'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim();
const names=new Set(employers.map(normalise));
export const civilServiceEmployerLabel=value=>names.has(normalise(value));
function applicationLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='adzuna.co.uk'||u.hostname==='www.adzuna.co.uk')?u.href:null;}catch{return null;}}
export async function evaluateAdzuna({appId,appKey,fetcher=fetch,terms=ADZUNA_TEST_TERMS,companies=[]}={}){
 if(!appId||!appKey)throw Error('Adzuna evaluation needs ADZUNA_APP_ID and ADZUNA_APP_KEY in the private local environment.');
 const jobs=new Map(),queries=[];let retrieved=0,invalid=0;
 const searches=[...terms.map(term=>({term,company:null})),...companies.map(company=>({term:'data information analytics AI digital technology software cyber analyst',company}))];
 for(const {term,company} of searches){
  const url=new URL('https://api.adzuna.com/v1/api/jobs/gb/search/1');
  const params=new URLSearchParams({app_id:appId,app_key:appKey,results_per_page:'50',sort_by:'date','content-type':'application/json'});
  params.set(company?'what_or':'what',term);if(company)params.set('company',company);url.search=params.toString();
  let response;try{response=await fetcher(url.href,{redirect:'error',headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});}catch{throw Error('Adzuna request failed. Credentials and request URLs are withheld.');}
  if(response.status!==200){await response.body?.cancel();if(response.status===400||response.status===404){queries.push({term,company,reportedMatches:null,sampled:0,error:`HTTP ${response.status}; query not evaluated`});continue;}throw Error(`Adzuna evaluation stopped: HTTP ${response.status}. No listings were published.`);}
  let data;try{data=await response.json();}catch{throw Error('Adzuna returned invalid JSON.');}
  if(!Array.isArray(data.results)||data.results.length>50)throw Error('Adzuna returned an unexpected result format.');
  queries.push({term,company,reportedMatches:Number.isFinite(data.count)?data.count:null,sampled:data.results.length});
  for(const job of data.results){
   retrieved++;const link=applicationLink(job.redirect_url);
   if(!job.id||typeof job.title!=='string'||!job.company?.display_name||!link){invalid++;continue;}
   jobs.set(String(job.id),{id:String(job.id),title:job.title,employer:String(job.company.display_name),location:job.location?.display_name||null,created:job.created||null,applicationUrl:link,employerLabelMatch:civilServiceEmployerLabel(job.company.display_name)});
  }
 }
 const rows=[...jobs.values()],matches=rows.filter(job=>job.employerLabelMatch);
 return {evaluatedAt:new Date().toISOString(),mode:'read-only; no publication',coverage:'One page per keyword; partial sample. Employer labels are matches, not independent verification. Closing dates and complete department coverage are not established.',queries,retrieved,unique:rows.length,duplicateResults:retrieved-invalid-rows.length,invalid,governmentEmployerMatches:matches.length,matchedEmployers:[...new Set(matches.map(job=>job.employer))].sort(),samples:matches};
}
