const choices={section:['attention','teams','applications'],status:['all','forming','active','paused','completed'],arrangement:['all','solo','team','flexible'],review:['all','new','clarification','shortlisted','declined','withdrawn']};
export function projectDirectoryFilters(input={}){
 const value=key=>typeof input[key]==='string'?input[key]:'';
 return {...Object.fromEntries(Object.entries(choices).map(([key,allowed])=>[key,allowed.includes(value(key))?value(key):allowed[0]])),project:value('project').slice(0,80)||'all',q:value('q').trim().slice(0,150),page:/^[0-9]{1,6}$/.test(value('page'))?Math.max(1,Number(value('page'))):1};
}
export function projectDirectoryHref(filters,changes={}){
 const next={...filters,...changes},params=new URLSearchParams();
 for(const key of ['section','project','status','arrangement','review','q','page','team','application','form'])if(next[key]!==undefined&&next[key]!==null&&next[key]!==''&&next[key]!=='all'&&!(key==='page'&&Number(next[key])===1))params.set(key,String(next[key]));
 return '/admin/projects'+(params.size?'?'+params:'');
}
