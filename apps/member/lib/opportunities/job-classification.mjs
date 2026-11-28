import taxonomy from './job-taxonomy.snapshot.json' with {type:'json'};
export const TAXONOMY_VERSION=taxonomy.version;
export const jobCategories=taxonomy.categories.map(({id,label})=>({id,label}));
export const discoveryTerms=[...new Set(taxonomy.categories.flatMap(c=>c.discoveryTerms))];
export function normaliseJobText(value){return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/<[^>]*>/g,' ').replace(/&amp;|&/gi,' and ').toLowerCase().replace(/visualization/g,'visualisation').replace(/modeling/g,'modelling').replace(/modeler/g,'modeller').replace(/[-–—/]/g,' ').replace(/[^a-z0-9+ ]/g,' ').replace(/\s+/g,' ').trim();}
const core=value=>normaliseJobText(value).replace(/^(?:(?:junior|graduate|trainee|associate|senior|lead|principal|staff|experienced|entry level)\s+)+/,'');
const contains=(text,phrase)=>(' '+text+' ').includes(' '+phrase+' ')||(' '+text+' ').includes(' '+phrase+'s ');
const occupations=taxonomy.occupations.map(o=>({...o,forms:[...new Set([o.canonicalTitle,...o.aliases].map(core))].filter(Boolean),conditionalForms:(o.contextAliases||[]).map(core)}));
const skills=[...new Set(taxonomy.categories.flatMap(c=>c.skills))];
const duties=[...new Set(taxonomy.categories.flatMap(c=>c.responsibilities))];
const action=/\b(analyse|analyze|analysing|analyzing|analysis|build|building|develop|developing|design|designing|create|creating|maintain|maintaining|implement|implementing|lead|leading|deliver|delivering|manage|managing|model|modelling|query|querying|monitor|monitoring|evaluate|evaluating|conduct|conducting|perform|performing|gather|gathering|elicit|eliciting|produce|producing|govern|governing|oversee|overseeing|responsible|responsibilities)\b/;
const negative=/\b(no|not|without|neither)\b.{0,30}\b(experience|knowledge|skills?|required|use|using)\b|\b(do not|does not|will not|must not)\b/;
export function detectSeniority(title){const t=normaliseJobText(title);const rules=[['executive',/\b(chief|vice president|vp|svp|cdo|cao|caio|cio|cto)\b/],['leadership',/\b(associate director|deputy head|head)\b/],['director',/\bdirector\b/],['management',/\b(manager|management)\b/],['principal',/\b(principal|distinguished)\b/],['staff',/\bstaff\b/],['lead',/\b(lead|technical lead|team lead)\b/],['senior',/\bsenior\b/],['internship',/\b(intern|internship|industrial placement|summer analyst)\b/],['apprenticeship',/\b(apprentice|apprenticeship)\b/],['graduate',/\b(graduate|new grad)\b/],['trainee',/\b(trainee|cadet)\b/],['entry_level',/\b(junior|entry level|assistant)\b/]];return rules.find(([,pattern])=>pattern.test(t))?.[0]||'not_stated';}
export function classifyJob(title,description='',context={}){
 const originalTitle=String(title??'').slice(0,300),t=normaliseJobText(originalTitle).replace(/\bdata manger\b/,'data manager'),d=normaliseJobText(String(description).slice(0,20000));
 const sentences=String(description).slice(0,20000).split(/[.;\n]+/).map(normaliseJobText).filter(s=>!negative.test(s));
 const foundSkills=skills.filter(skill=>sentences.some(s=>{if(skill!=='R')return contains(s,normaliseJobText(skill));const clean=s.replace(/\br and d\b/g,'research development');return contains(clean,'r')&&/\b(programming|language|coding|script|using|use|python|sql|statistical|sas|stata)\b/.test(clean);}));
 const foundDuties=duties.filter(duty=>sentences.some(s=>action.test(s)&&contains(s,normaliseJobText(duty))));
 if(sentences.some(s=>/\b(build|develop|design|create|maintain|produce)\w*\b.{0,65}\b(dashboards?|reports?)\b/.test(s)))foundDuties.push('dashboard development');
 const supportingSkills=[...new Set(foundSkills)],responsibilities=[...new Set(foundDuties)],seniority=detectSeniority(originalTitle);
 let matches=occupations.flatMap(o=>{const forms=o.forms.filter(f=>contains(t,f));return forms.length?[{...o,specificity:Math.max(...forms.map(f=>f.length))}]:[];}).sort((a,b)=>Number(a.titlePolicy==='context')-Number(b.titlePolicy==='context')||b.specificity-a.specificity||a.id.localeCompare(b.id));
 // Reordered titles use whole occupational tokens, never substring acronym matches.
 if(!matches.length){const words=new Set(t.split(' '));matches=occupations.flatMap(o=>{const valid=o.forms.filter(f=>{const tokens=f.split(' ').filter(v=>!['and','of','the','for'].includes(v));return tokens.length>=2&&tokens.every(v=>words.has(v));});return valid.length?[{...o,specificity:Math.max(...valid.map(v=>v.length))}]:[];}).sort((a,b)=>Number(a.titlePolicy==='context')-Number(b.titlePolicy==='context')||b.specificity-a.specificity||a.id.localeCompare(b.id));}
 // Bare abbreviations are context-only and never preempt full occupational matches.
 if(!matches.length)matches=occupations.filter(o=>o.conditionalForms.includes(core(t))).map(o=>({...o,titlePolicy:'context',specificity:0}));
 // Reordered/combined UK titles: require an occupational noun as well as the domain.
 if(!matches.length&&!/\b(data cent(er|re)|warehouse|logistics|inventory)\b/.test(t)&&/\b(data|insights?|information|performance)\b/.test(t)&&/\b(analyst|officer|lead|specialist)\b/.test(t)){
  const category=/\bperformance\b/.test(t)?'08':/\binformation\b/.test(t)?'09':'01';
  matches=[{id:'combined-'+category,canonicalTitle:category==='08'?'Performance and Insight Analyst':category==='09'?'Information Analyst':'Data and Insight Analyst',categoryIds:[category],titlePolicy:/\banalyst\b/.test(t)?'direct':'context',specificity:0}];
 }
 const physicalWarehouse=/\bwarehouse (specialist|assistant|clerk)\b/.test(t)&&!/\bdata warehouse\b/.test(t);
 const nonProfessional=physicalWarehouse||/\b(data entry|entry clerk|warehouse operative|call centre|sales representative|sales executive|sales manager)\b/.test(t)||(/\b(staff nurse|registered nurse|care assistant|customer service|administrative assistant)\b/.test(t)&&!matches.some(m=>m.titlePolicy==='direct'));
 const internal=/\binternal (applicants|candidates|employees|staff) only\b|\bonly open to (current|existing) (employees|staff)\b/i.test(originalTitle+' '+description)||/\(internal\)|\binternal[- ]only\b|\binternal vacancy\b/i.test(originalTitle);
 const direct=matches.some(m=>m.titlePolicy==='direct');
 const potentialDomain=/\b(data|analytics|informatics|bioinformatics|artificial intelligence|machine learning|genai|llm|geospatial)\b/.test(t);
 const supported=(supportingSkills.length>=2&&responsibilities.length>=1)||(supportingSkills.length>=1&&responsibilities.length>=2)||responsibilities.length>=3;
 const descriptionOnly=supportingSkills.length>=2&&responsibilities.length>=2;
 let score,status,reasons;
 if(internal){score=10;status='low';reasons=['Explicit internal-only eligibility; not a public vacancy'];}
 else if(nonProfessional){score=10;status='low';reasons=['Excluded routine/non-professional title; technical mentions do not override it'];}
 else if(direct){score=Math.min(98,88+Math.min(supportingSkills.length+responsibilities.length,5)*2);status='high';reasons=['Recognised professional occupation: '+matches[0].canonicalTitle];}
 else if((matches.length&&supported)||(!matches.length&&descriptionOnly)){score=Math.min(96,85+supportingSkills.length+responsibilities.length);status='high';reasons=[matches.length?'Conditional title supported by technical duties':'Unusual title supported by technical skills and responsibilities'];}
 else if(matches.length||potentialDomain||responsibilities.length&&supportingSkills.length){score=Math.min(79,60+supportingSkills.length*3+responsibilities.length*4);status='medium';reasons=['Description review required; title or isolated keywords are insufficient'];}
 else{score=Math.min(39,10+supportingSkills.length*4+responsibilities.length*5);status='low';reasons=['Insufficient professional Data/AI/technology evidence'];}
 const ids=new Set(matches.flatMap(m=>m.categoryIds).filter(id=>id!=='20'||/government|civil service|public sector/.test(t)));
 if(status==='high')for(const c of taxonomy.categories)if(c.responsibilities.filter(r=>responsibilities.includes(r)).length>=1&&(c.skills.some(s=>supportingSkills.includes(s))||c.responsibilities.filter(r=>responsibilities.includes(r)).length>=2))ids.add(c.id);
 const industries=[];
 if(/government|civil service|public sector/.test(t))industries.push('Public sector');
 if(context.provider==='nhs'||/\b(nhs|healthcare|clinical|hospital|public health)\b/.test(t+' '+normaliseJobText(context.organisation))){industries.push('Healthcare');if(status!=='low')ids.add('10');}
 const employer=normaliseJobText(context.organisation);
 const publicEmployer=(/\bnhs\b/.test(employer)&&/\b(trust|integrated care board|icb|england|business services authority)\b/.test(employer))||/^(government recruitment service|crown prosecution service|public health wales)$/.test(employer);
 if(context.provider==='civilservice'||publicEmployer||/civil service|government recruitment service/.test(normaliseJobText(context.sourceOrganisation))){if(!industries.includes('Public sector'))industries.push('Public sector');if(status!=='low')ids.add('20');}
 if(status==='high'&&['executive','leadership','director','management','principal','staff','lead'].includes(seniority))ids.add('19');
 for(const m of matches)for(const hint of m.industryHints||[])if(!industries.includes(hint))industries.push(hint);
 // Technical duties alone do not establish a public-sector employer or remit.
 if(!industries.includes('Public sector'))ids.delete('20');
 const categoryIds=[...ids].sort();let primary=matches[0]?.categoryIds[0]||categoryIds.find(id=>!['10','19','20'].includes(id))||null;
 for(const [pattern,id] of [[/data (engineer|engineering|platform|pipeline|integration)/,'04'],[/data (and ai )?(governance|quality|assurance|steward)|governance.*data/,'09'],[/business intelligence|power bi|\bbi\b|management information|\bmi\b/,'03'],[/data scien|machine learning|mlops/,'05'],[/\b(ai|genai|llm|agentic)\b|artificial intelligence/,'06'],[/statistic|operational research|operations research|econom/,'07']])if(pattern.test(t)&&ids.has(id)){primary=id;break;}
 if(status==='high'&&!categoryIds.length){status='medium';score=79;reasons.push('Occupational category needs review before publication');}
 const roleFamily=internal?'Internal only':nonProfessional?'Excluded':matches[0]?.canonicalTitle||(status==='low'?'Other':'Data / AI adjacent');
 reasons.push(supportingSkills.length+' supporting skill signals',responsibilities.length+' relevant responsibility signals');
 return {version:TAXONOMY_VERSION,score,status,confidence:status==='high'?'strong':status==='medium'?'review':'low',scoreType:'rule-based relevance; not a probability',semanticModelUsed:false,roleFamily,canonicalTitle:matches[0]?.canonicalTitle||null,occupationIds:matches.slice(0,8).map(m=>m.id),primaryCategory:primary,categories:categoryIds,seniority,industries,skills:supportingSkills,responsibilities,reasons,eligible:status==='high'&&score>=85};
}

export function discoveryPlan({at=Date.now(),limit=12}={}){const anchors=['data','information','business analyst','artificial intelligence','machine learning'];const pool=discoveryTerms.filter(t=>!anchors.includes(t));const count=Math.max(0,Math.min(12,Math.floor(limit))-anchors.length);const start=(Math.floor(at/86400000)*Math.max(1,count))%pool.length;const terms=[...anchors.slice(0,Math.max(1,Math.min(12,Math.floor(limit)))),...Array.from({length:Math.min(count,pool.length)},(_,i)=>pool[(start+i)%pool.length])];return {terms,coverageNote:terms.length+' bounded keyword searches of '+discoveryTerms.length+' taxonomy discovery terms; non-anchor terms rotate by UTC day. Not complete market coverage.'};}
