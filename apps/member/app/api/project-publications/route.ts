import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {publishedProjects} from '@/lib/project-publications';
export const dynamic='force-dynamic';
export async function GET(request:Request){const url=new URL(request.url);const page=Math.max(1,Math.min(100000,Number(url.searchParams.get('page'))||1)),q=(url.searchParams.get('q')||'').trim().slice(0,150);try{const db=await createServerSupabaseClient();return NextResponse.json(await publishedProjects(db,'',Math.floor(page),q),{headers:{'Cache-Control':'no-store',...(process.env.NODE_ENV==='development'?{'Access-Control-Allow-Origin':'http://127.0.0.1:3002'}:{})}});}catch{return NextResponse.json({error:'New project briefs could not load.'},{status:503});}}
