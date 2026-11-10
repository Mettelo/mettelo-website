import type {MetadataRoute} from 'next';
import staticUrls from '@/lib/public-sitemap.snapshot.json';
import {publicNews,type PublishedArticle} from '@/lib/news-server';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const entries:MetadataRoute.Sitemap=[...staticUrls,'https://mettelo.com/industry-news','https://mettelo.com/opportunities'].map(url=>({url}));
 // Anonymous API exposes only published documents. Fail rather than silently omit articles.
 for(let page=1;;page++){
  const data=await publicNews(null,{page:String(page)}) as {items:PublishedArticle[];total:number};
  if(!Array.isArray(data?.items)||!Number.isFinite(data.total))throw Error('Published article catalogue unavailable');
  entries.push(...data.items.map(a=>({url:'https://mettelo.com/industry-news/'+a.slug,lastModified:a.published_at})));
  if(page*12>=data.total)break;
  if(!data.items.length||page>=1000)throw Error('Published article catalogue incomplete');
 }
 return entries;
}
