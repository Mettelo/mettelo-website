const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function feedReadQuery(query){
 const post=query.get('post_id');if(post){if(!uuid.test(post))throw Error('Invalid post.');return {action:'post',payload:{post_id:post}};}
 const before_at=query.get('before_at'),before_id=query.get('before_id');
 if(Boolean(before_at)!==Boolean(before_id)||before_at&&(!Number.isFinite(Date.parse(before_at))||!uuid.test(before_id)))throw Error('Invalid feed cursor.');
 const view=['following','bookmarks'].includes(query.get('view'))?query.get('view'):'all';
 const category=['updates','projects','ideas','seeking'].includes(query.get('category'))?query.get('category'):'all';
 return {action:'feed',payload:{...(category!=='all'?{category}:{}),q:(query.get('q')||'').trim().slice(0,150),view,...(before_at?{before_at,before_id}:{})}};
}
export function appendFeedPage(current,next){const ids=new Set(current.map(post=>post.id));return [...current,...next.filter(post=>{if(ids.has(post.id))return false;ids.add(post.id);return true;})];}
