import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {discoveryRpc} from '@/lib/market-discovery';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||!profileRequestOriginAllowed(origin))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401});
 const raw=await request.text();if(raw.length>2000)return NextResponse.json({error:'Request too large.'},{status:413});
 const form=new URLSearchParams(raw);if(form.get('action')!=='follow_project')return NextResponse.json({error:'Unsupported action.'},{status:400});
 const back=new URL('/member/market',origin),team=form.get('team_id');if(team&&/^[0-9a-f-]{36}$/i.test(team))back.pathname+='/projects/'+team;
 try{await discoveryRpc(db,'follow_project',{project_ref:form.get('project_ref'),enabled:form.get('enabled')==='true'});back.searchParams.set('notice','Project follow preference saved.');}catch{back.searchParams.set('error','The preference could not be saved. Try again.');}
 return NextResponse.redirect(back,303);
}
