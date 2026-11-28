import {ImageResponse} from 'next/og';
import {readSharedProof} from '@/lib/shared-portfolio';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const alt='A selected contribution shared through Mettelo Portfolio';
export const size={width:1200,height:630};
export const contentType='image/png';
export default async function Image({params}:{params:Promise<{token:string}>}){
 const {token}=await params,proof=await readSharedProof(token);if(!proof)return new Response('Summary unavailable',{status:404});
 const category=proof.kind==='delivery'?'TEAM DELIVERY':proof.kind==='milestone'?'MILESTONE OUTCOME':'INDIVIDUAL CONTRIBUTION';
 return new ImageResponse(<div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%',height:'100%',padding:60,background:'#141824',color:'#fff',fontFamily:'sans-serif',borderBottom:'12px solid #c6892a'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong style={{fontSize:38}}>Mettelo</strong><span style={{fontSize:20,color:'#f7efdd'}}>PORTFOLIO / {category}</span></div><div style={{display:'flex',flexDirection:'column',gap:22}}><strong style={{fontSize:proof.title.length>95?44:56,lineHeight:1.16,letterSpacing:-1}}>{proof.title}</strong><span style={{fontSize:24,lineHeight:1.5,color:'#c0bfc3'}}>{proof.summary.length>175?proof.summary.slice(0,175)+'…':proof.summary}</span></div><div style={{display:'flex',justifyContent:'space-between',gap:30,fontSize:20,color:'#f7efdd'}}><span>Shared by {proof.author_display}</span><span>Member-written · not a verified credential</span></div></div>,size);
}
