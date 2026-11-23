export function supportFilters(query={}){
 const pick=(key,values,fallback)=>values.includes(query[key])?query[key]:fallback;
 return {filter:pick('filter',['attention','waiting','done','all'],'attention'),source:pick('source',['all','public','member'],'all'),ownership:pick('ownership',['all','unassigned','assigned','unavailable'],'all'),topic:String(query.topic||'all').slice(0,60),q:String(query.q||'').trim().slice(0,150),page:Math.max(1,Math.min(100000,parseInt(query.page||'1',10)||1))};
}
export function supportHref(filters,patch={}){const next={...filters,...patch};return '/admin/support?'+new URLSearchParams(Object.entries(next).map(([k,v])=>[k,String(v)]));}
