import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
import {activateGithubRequirement} from '@/lib/github-connection';
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified administrator sign-in required.'},{status:401});
 const {data,error}=await db.rpc('website_admin_capabilities');if(error||!data?.roles)return NextResponse.json({error:'Full administrator access required.'},{status:403});
 try{await activateGithubRequirement(user.id);return NextResponse.json({ok:true},{headers:{'Cache-Control':'private, no-store'}})}catch{return NextResponse.json({error:'GitHub sign-in, manual account linking and the organisation app must be configured before enabling this requirement.'},{status:503})}
}
