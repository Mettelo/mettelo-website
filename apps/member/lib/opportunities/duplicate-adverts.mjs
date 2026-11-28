import {normaliseJobText} from './job-classification.mjs';
const employer=value=>normaliseJobText(value).replace(/\s*linkedin$/,'').trim();
const shingles=text=>{const words=normaliseJobText(text).split(' ');return new Set(words.slice(0,-4).map((_,i)=>words.slice(i,i+5).join(' ')));};
// Similar descriptions are evidence for holding a pair, never for deleting or merging it.
function similar(a,b){
 const left=normaliseJobText(a),right=normaliseJobText(b);
 if(left.length<250||right.length<250)return false;
 if(left===right)return true;
 const x=shingles(left),y=shingles(right);let intersection=0;for(const word of x)if(y.has(word))intersection++;
 return intersection/(x.size+y.size-intersection)>=0.9;
}
export function holdDuplicateAdverts(jobs){
 const groups=new Map(),held=new Map();
 for(let i=0;i<jobs.length;i++){
  const j=jobs[i];if(!j.classification.eligible||!j.location||!j.organisation)continue;
  const key=[employer(j.organisation),normaliseJobText(j.title),normaliseJobText(j.location),j.countryCode||''].join('|');
  const previous=groups.get(key)||[];
  for(const n of previous){const p=jobs[n];if(p.provider+':'+p.externalId===j.provider+':'+j.externalId)continue;
   if(similar(p.description,j.description)){held.set(i,new Set([...(held.get(i)||[]),p.provider+':'+p.externalId]));held.set(n,new Set([...(held.get(n)||[]),j.provider+':'+j.externalId]));}
  }
  groups.set(key,[...previous,i]);
 }
 return jobs.map((j,i)=>!held.has(i)?j:({...j,classification:{...j.classification,eligible:false,status:'medium',confidence:'review',score:Math.min(79,j.classification.score),duplicateReview:true,reasons:[...j.classification.reasons,'Possible duplicate advert: matching employer, title, location and substantially matching description; held with '+[...held.get(i)].sort().join(', ')]}}));
}
