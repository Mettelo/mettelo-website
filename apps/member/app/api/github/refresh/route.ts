import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
import {syncGithub} from '@/lib/github-connection';
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401});
 let resend=false;try{const raw=await request.text();if(raw.length>1000)throw Error();const body=raw?JSON.parse(raw):{};if(Object.keys(body).some(k=>k!=='resend')||(body.resend!==undefined&&typeof body.resend!=='boolean'))throw Error();resend=body.resend===true}catch{return NextResponse.json({error:'Invalid status request.'},{status:400})}
 try{return NextResponse.json({connection:await syncGithub(db,user.id,resend)},{headers:{'Cache-Control':'private, no-store'}})}catch{return NextResponse.json({error:'Your GitHub status could not be refreshed. Please try again.'},{status:503})}
}
