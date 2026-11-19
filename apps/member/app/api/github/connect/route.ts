import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {memberOrigin,profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
import {githubProviderEnabled} from '@/lib/github-connection';
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Sign in to your existing Mettelo account first.'},{status:401});
 if(!await githubProviderEnabled())return NextResponse.json({error:'GitHub connection setup is not complete yet. Please contact Mettelo support.'},{status:503});
 const {data,error}=await db.auth.linkIdentity({provider:'github',options:{redirectTo:memberOrigin()+'/auth/callback?flow=github-link&next=%2Fmember%2Fprofile',skipBrowserRedirect:true}});
 if(error||!data.url){
  const code=error?.code||'link_failed';
  const message=code==='manual_linking_disabled'?'Connecting GitHub to an existing account is not enabled yet. Ask Mettelo to enable manual linking.':code==='identity_already_exists'?'This GitHub account is already connected to another Mettelo account. Contact Mettelo support to review it.':'GitHub could not be connected. Your current Mettelo account is unchanged; please try again.';
  console.warn('GitHub linking rejected',{code});
  return NextResponse.json({error:message},{status:code==='manual_linking_disabled'?503:409});
 }
 const response=NextResponse.json({url:data.url},{headers:{'Cache-Control':'private, no-store'}});response.cookies.set('mettelo_github_link_uid',user.id,{httpOnly:true,secure:memberOrigin().startsWith('https:'),sameSite:'lax',maxAge:600,path:'/auth/callback'});return response;
}
