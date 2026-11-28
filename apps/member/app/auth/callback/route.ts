import {cookies} from 'next/headers';
import {syncGithub} from '@/lib/github-connection';
import {memberOrigin} from '@/lib/request-origin.mjs';
import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {safeMemberPath} from '@/lib/auth-navigation.mjs';
function clearGithubLink(response:NextResponse){response.cookies.set('mettelo_github_link_uid','',{httpOnly:true,sameSite:'lax',secure:memberOrigin().startsWith('https:'),maxAge:0,path:'/auth/callback'});}
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
      const {data:{user}}=await db.auth.getUser();
      if(flow==='github-link'){
        const expected=(await cookies()).get('mettelo_github_link_uid')?.value;
        if(!user||!expected||user.id!==expected){const failed=NextResponse.redirect(new URL('/member/profile?error=GitHub+link+could+not+be+confirmed.+Please+try+again+from+your+existing+account.',origin));clearGithubLink(failed);return failed;}
      }
      if(user?.email_confirmed_at&&user.identities?.some(i=>i.provider==='github')){try{await syncGithub(db,user.id)}catch{/* Sign-in succeeds even if invitation delivery needs a retry in My profile. */}}
      const target=new URL(flow==='signup'?'/auth/verified':next,origin);
      if(flow==='signup')target.searchParams.set('next',next);
      if(flow==='github-link')target.searchParams.set('notice','GitHub connected. Your Mettelo username is unchanged.');
      const response=NextResponse.redirect(target);if(flow==='github-link')clearGithubLink(response);response.headers.set('Cache-Control','private, no-store');return response;
    }
  }
  if(flow==='github-link'){const response=NextResponse.redirect(new URL('/member/profile?error=GitHub+connection+was+not+completed.+Your+Mettelo+account+is+unchanged.',origin));response.cookies.delete('mettelo_github_link_uid');return response;}
  const target=new URL('/signin',origin);target.searchParams.set('error','expired-link');
  if(flow==='recovery')target.searchParams.set('mode','reset');
  return NextResponse.redirect(target);
}
