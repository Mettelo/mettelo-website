import {ImageResponse} from 'next/og';
import {publicNews} from '@/lib/news-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const alt='Mettelo Industry News';
export const size={width:1200,height:630};
export const contentType='image/png';
export default async function Image({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>100)return new Response('Not found',{status:404});
 const article=await publicNews(slug);if(!article)return new Response('Not found',{status:404});
 return new ImageResponse(<div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%',height:'100%',background:'#101522',color:'#fff',padding:64,borderBottom:'14px solid #c9a25d',fontFamily:'sans-serif'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong style={{fontSize:38}}>Mettelo<span style={{color:'#d8b76d'}}>.</span></strong><span style={{fontSize:21,color:'#d8b76d'}}>INDUSTRY NEWS / {article.format.toUpperCase()}</span></div><div style={{display:'flex',flexDirection:'column',gap:24}}><span style={{fontSize:22,color:'#d8b76d'}}>{article.category}</span><strong style={{fontSize:article.title.length>100?48:60,lineHeight:1.13,letterSpacing:-2}}>{article.title}</strong></div><span style={{fontSize:22,color:'#c8cdd7'}}>Ideas. Context. What’s next. · mettelo.com</span></div>,size);
}
