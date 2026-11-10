export function sourceSelectionReport(jobs,candidates){
 const eligible=new Set(candidates.filter(job=>job.classification.status==='high'&&job.classification.score>=85).map(job=>`${job.provider}:${job.externalId}`));
 const scanned=new Map(candidates.map(job=>[`${job.provider}:${job.externalId}`,job]));
 const unique=new Map(jobs.map(job=>[`${job.provider}:${job.externalId}`,job]));
 const report={eligible:0,internalOnly:0,outOfScope:0,reviewRequired:0,staleOrClosed:0,duplicates:jobs.length-unique.size};
 for(const key of unique.keys()){
  if(eligible.has(key))report.eligible++;
  else if(!scanned.has(key))report.staleOrClosed++;
  else if(scanned.get(key).classification.roleFamily==='Internal only')report.internalOnly++;
  else if(scanned.get(key).classification.status==='medium'){report.reviewRequired++;if(scanned.get(key).classification.duplicateReview)report.duplicateReview=(report.duplicateReview||0)+1;}
  else report.outOfScope++;
 }
 return report;
}
