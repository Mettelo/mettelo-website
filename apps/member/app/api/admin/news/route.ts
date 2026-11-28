import {NextResponse} from 'next/server';
import {newsAdmin} from '@/lib/news-server';
import {normaliseArticle} from '@/lib/news.mjs';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 let db;try{db=await newsAdmin();}catch{return NextResponse.json({error:'News administrator access required.'},{status:403});}
 const raw=await request.text();if(new TextEncoder().encode(raw).length>220000)return NextResponse.json({error:'Article request is too large.'},{status:413});
 let input;try{input=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid article request.'},{status:400});}
 if(!input||!['save','publish','unpublish'].includes(input.action)||typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)||!Number.isInteger(input.revision)||input.revision<0)return NextResponse.json({error:'Invalid article action or revision.'},{status:400});
 let payload={id:input.id,revision:input.revision};
 try{if(input.action==='save'){
  if(typeof input.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)||input.slug.length>100)throw Error('Use a URL slug containing lowercase letters, numbers and hyphens.');
  payload={...payload,...{slug:input.slug,document:normaliseArticle(input.document)}};
 }}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Check the article fields.'},{status:400});}
 const {data,error}=await db.rpc('website_news_admin',{p_action:input.action,p_payload:payload});
 if(error)return NextResponse.json({error:error.code==='23505'?'That article URL is already in use. Choose another slug.':['P0001','40001'].includes(error.code)?error.message:'The article could not be updated. Reload the saved version and try again.'},{status:error.code==='42501'?403:error.code==='P0002'?404:409});
 return NextResponse.json({article:data},{headers:{'Cache-Control':'private, no-store'}});
}
