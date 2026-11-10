export function pipelineActionLabel(action){return ({prepare:'Prepare preview',publish:'Publish listings',archive:'Remove listing',verify:'Check source links',expire:'Hide expired listings','scan-civilservice':'Continue Civil Service scan',scan_commit:'Save Civil Service progress',record_check:'Check source link'})[action]||'Pipeline activity';}
export function pipelineActionMessage(action,result={}){
 if(action==='prepare')return `Preview ready: ${result.candidates??0} eligible listings. Nothing has been published by this action.`;
 if(action==='publish')return `${result.written??0} listings written or refreshed; ${result.rejected??0} rejected by publication checks; ${result.protected??0} protected from changes.`;
 if(action==='archive')return 'Listing hidden. Saved references remain available, and automatic discovery will not republish it.';
 if(action==='verify')return `${result.checked??0} source links checked; ${result.expired??0} listings hidden; ${result.transient??0} temporarily unavailable; ${result.skipped??0} not supported for automatic checking.`;
 if(action==='expire')return `${result.expired??0} listings hidden by deadline or freshness rules.`;
 if(action==='scan-civilservice')return `${result.pagesScanned??0} pages scanned; ${result.uniqueVacancies??0} distinct GRS vacancies found. ${result.complete?'Selected-keyword scan finished.':'Progress saved. Continue when ready.'}`;
 if(action==='scan_commit')return `${result.pages??0} pages scanned; ${result.jobs??0} distinct GRS vacancies found.`;
 if(action==='record_check')return result.expired?'Listing hidden after confirmed checks.':'Source check recorded; listing retained.';
 return 'Activity recorded.';
}
