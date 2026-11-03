import {safeMemberPath} from '@/lib/auth-navigation.mjs';
import {memberOrigin} from '@/lib/request-origin.mjs';
import {createServerClient} from '@supabase/ssr';
import type {CookieOptions} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {memberSupabaseConfiguration} from '@/lib/supabase/config';
export async function middleware(request:NextRequest){
  const {url,key}=memberSupabaseConfiguration();
  let response=NextResponse.next({request});
  const db=createServerClient(url,key,{cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll(items:{name:string;value:string;options?:CookieOptions}[]){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
  }});
  const {data:{user}}=await db.auth.getUser();
  if(!user){const target=new URL('/signin',memberOrigin());target.searchParams.set('next',safeMemberPath(request.nextUrl.pathname+request.nextUrl.search));const redirect=NextResponse.redirect(target);response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));response=redirect;}
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
export const config={matcher:['/member/:path*','/onboarding']};
