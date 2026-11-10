export const portfolioKinds=['all','contribution','milestone','delivery'];
export function portfolioQuery(params={}){
 const kind=portfolioKinds.includes(params.kind)?params.kind:'all';
 const q=typeof params.q==='string'?params.q.trim().slice(0,150):'';
 const raw=typeof params.page==='string'&&/^\d{1,7}$/.test(params.page)?Number(params.page):1;
 return {kind,q,page:Number.isInteger(raw)&&raw>=1&&raw<=1000000?raw:1};
}
export function portfolioHref(query,page=1){const p=new URLSearchParams();if(query.kind!=='all')p.set('kind',query.kind);if(query.q)p.set('q',query.q);if(page>1)p.set('page',String(page));return '/member/portfolio'+(p.size?'?'+p.toString():'');}
export function portfolioEvidenceUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export const portfolioReviewLabels={'member-reported':'Member-reported','reviewed':'Reviewed','acceptance-recorded':'Acceptance recorded','team-outcome':'Team outcome'};
