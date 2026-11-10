import {hostedStaging} from '@/lib/site-origins.mjs';
import {stagingAccess} from '@/lib/staging-access.mjs';
import {safeMemberPath} from '@/lib/auth-navigation.mjs';
import {memberInterfaceOrigin} from '@/lib/request-origin.mjs';
import {createServerClient} from '@supabase/ssr';
import type {CookieOptions} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {memberSupabaseConfiguration} from '@/lib/supabase/config';
export async function middleware(request:NextRequest){
  if(hostedStaging()){
    const access=await stagingAccess(request.headers.get('authorization'));
    if(!access.allowed)return new NextResponse(access.configured?'Staging access required.':'Staging access is not configured.',{status:access.configured?401:503,headers:{'WWW-Authenticate':'Basic realm="Mettelo staging", charset="UTF-8"','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
  }
  const path=request.nextUrl.pathname;
  if(!(path==='/member'||path.startsWith('/member/')||path==='/admin'||path.startsWith('/admin/')||path==='/onboarding'))return NextResponse.next();
  const {url,key}=memberSupabaseConfiguration();
  let response=NextResponse.next({request});
  const db=createServerClient(url,key,{cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll(items:{name:string;value:string;options?:CookieOptions}[]){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
  }});
  const {data:{user}}=await db.auth.getUser();
  if(!user){const target=new URL('/signin',memberInterfaceOrigin());target.searchParams.set('next',safeMemberPath(request.nextUrl.pathname+request.nextUrl.search));const redirect=NextResponse.redirect(target);response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));response=redirect;}
  if(user){const access=await db.rpc('website_account_access');if(access.error||access.data?.allowed!==true){const target=new URL('/account-paused',memberInterfaceOrigin());if(access.error)target.searchParams.set('unavailable','1');const redirect=NextResponse.redirect(target);response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));response=redirect;}}
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
export const config={matcher:['/:path*']};
