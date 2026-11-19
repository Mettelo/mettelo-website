import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {contentAdmin,publicContent} from '@/lib/site-content';
import {contentPath} from '@/lib/site-content-contract.mjs';
import {renderContentHtml,escapeContent} from '@/lib/site-content-render.mjs';
import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import {publicIndexingEnabled} from '@/lib/seo-policy.mjs';
export const dynamic='force-dynamic';
async function source(file:string){for(const root of process.env.NODE_ENV==='development'?[join(process.cwd(),'../../dist'),join(process.cwd(),'public/_site')]:[join(process.cwd(),'public/_site')])try{return await readFile(join(root,file),'utf8')}catch{}throw Error('Page template unavailable');}
export async function GET(request:Request){
 const url=new URL(request.url),path=url.searchParams.get('path')||'/',previewKey=url.searchParams.get('preview_key');
 if(!['/','/our-story/','/projects/'].includes(path)&&!/^\/projects\/(?:mtl-[a-z0-9-]+\/|published\/MTL-MP-[A-F0-9]{12})$/.test(path))return new NextResponse('Page not found',{status:404});
 const ref=path.startsWith('/projects/')&&path!=='/projects/'?path.split('/').filter(Boolean).at(-1)!.toUpperCase():null,key=ref?'project:'+ref:path==='/our-story/'?'page:about':path==='/'?'page:home':'projects';
 try{const db=await createServerSupabaseClient();const [rows,brands,projects]=await Promise.all([publicContent(db,key),publicContent(db,'brand:defaults'),['page:home','projects'].includes(key)?publicContent(db,'projects'):Promise.resolve([])]);let data=rows.find(row=>row.key===key)?.data,brand=brands[0]?.data||{};
  if(previewKey){if(contentPath(previewKey)!==path)return new NextResponse('Preview not found',{status:404});const doc=await contentAdmin(db,'get',{key:previewKey});if(previewKey==='brand:defaults')brand=doc.draft;else data=doc.draft;}
  let html:string;
  if(ref?.startsWith('MTL-MP-')){if(!data)return new NextResponse('Brief not found',{status:404});html=await source('projects/mtl-da-001/index.html');const E=escapeContent;html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,()=>'<main id="main" tabindex="-1"><section class="wrap"><p>Project brief · '+E(ref)+'</p><h1>'+E(data!.title)+'</h1><p class="detail-lead">'+E(data!.description)+'</p><article class="detail-content"><section id="problem"><h2>The problem</h2><p>'+E(data!.problem)+'</p></section><section><h2>Project roles</h2><ul>'+(data!.roles||[]).map((role:string)=>'<li>'+E(role)+'</li>').join('')+'</ul></section><section><a class="btn" href="'+E(data!.repository)+'">Open repository</a></section></article><aside class="project-interest"><a class="btn primary" href="/member/projects/'+E(ref)+'/interest">Apply to contribute</a></aside></section></main>');}
  else html=await source(path==='/'?'index.html':path.slice(1)+'index.html');
  html=renderContentHtml(html,{key,data,brand,projects,origin:publicWebsiteOrigin(),preview:Boolean(previewKey)});
  if(previewKey)html=html.replace('<head>','<head><base href="'+escapeContent(publicWebsiteOrigin()+path)+'">');
  return new NextResponse(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Robots-Tag':previewKey||!publicIndexingEnabled()?'noindex, nofollow':'index, follow'}});
 }catch(error){if(previewKey&&(error as {code?:string}).code==='42501')return new NextResponse('Sign in with an authorised administrator account to preview this draft.',{status:403,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});console.warn('Website rendering unavailable:',error instanceof Error?error.message:'Unknown error');return new NextResponse('This page is temporarily unavailable. Please reload shortly.',{status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});}
}
