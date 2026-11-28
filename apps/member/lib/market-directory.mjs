const text=(value,limit)=>typeof value==='string'?value.slice(0,limit):'';
function filters(query,prefix=''){
 const q=text(query[prefix+'q'],150),area=text(query[prefix+'area'],120),page=Math.max(1,Math.min(100000,parseInt(query[prefix+'page']||'1',10)||1));
 return {...(q?{q}:{}),...(area?{area}:{}),...(page>1?{page:String(page)}:{})};
}
export function directoryDetailHref(kind,id,query={}){
 const context=filters(query),params=new URLSearchParams(Object.entries(context).filter(([key])=>kind==='people'||key!=='area').map(([key,value])=>['directory_'+key,value]));
 return '/member/market/'+(kind==='people'?'people':'projects')+'/'+encodeURIComponent(id)+(params.size?'?'+params:'');
}
export function directoryReturnHref(kind,query={}){
 const context=filters(query,'directory_');if(kind!=='people')delete context.area;
 return '/member/market?'+new URLSearchParams({tab:kind==='people'?'people':'projects',...context});
}
