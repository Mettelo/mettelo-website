import {memberOrigin} from '@/lib/request-origin.mjs';
import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {safeMemberPath} from '@/lib/auth-navigation.mjs';
export async function GET(request:Request){
  const url=new URL(request.url);
  const origin=memberOrigin();
  const flow=url.searchParams.get('flow');
  const next=safeMemberPath(url.searchParams.get('next'),flow==='recovery'?'/auth/update-password':'/member');
  const code=url.searchParams.get('code');
  if(code&&!url.searchParams.has('error')){
    const db=await createServerSupabaseClient();
    const {error}=await db.auth.exchangeCodeForSession(code);
    if(!error){
      const target=new URL(flow==='signup'?'/auth/verified':next,origin);
      if(flow==='signup')target.searchParams.set('next',next);
      const response=NextResponse.redirect(target);response.headers.set('Cache-Control','private, no-store');return response;
    }
  }
  const target=new URL('/signin',origin);target.searchParams.set('error','expired-link');
  if(flow==='recovery')target.searchParams.set('mode','reset');
  return NextResponse.redirect(target);
}
