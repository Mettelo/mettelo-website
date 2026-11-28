import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
import {journeyMailConfiguration,runJourneyMail,sendWithResend} from '@/lib/journey-mail.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401});
 const {data:cap,error:capError}=await db.rpc('website_admin_capabilities');if(capError||!cap?.operations)return NextResponse.json({error:'Operations administrator required.'},{status:403});
 const config=journeyMailConfiguration(process.env);
 const rpc=async(action:string,payload:Record<string,unknown>)=>{const {data,error}=await db.rpc('website_journey_mail_worker',{p_action:action,p_payload:payload});if(error)throw Error('Communication queue unavailable');return data;};
 try{
  const raw=await request.text();if(raw.length>200)return NextResponse.json({error:'Request too large.'},{status:413});const body=JSON.parse(raw);
  if(body.action==='status')return NextResponse.json({...config,...await rpc('status',{})},{headers:{'Cache-Control':'private, no-store'}});
  if(!['send','test'].includes(body.action)||body.confirm_admin_only!==true)return NextResponse.json({error:'Confirm administrator-only test delivery.'},{status:400});
  if(!config.ready||!user.email)return NextResponse.json({error:'Add the Resend key and approved sender to the private staging environment first.'},{status:503});
  if(body.action==='test'){if(typeof body.nonce!=='string'||!/^[0-9a-f-]{36}$/i.test(body.nonce))return NextResponse.json({error:'Test identity required.'},{status:400});await rpc('test',{nonce:body.nonce});}
  const result=await runJourneyMail({rpc,send:(mail:Record<string,unknown>,key:string)=>sendWithResend(mail,key,{apiKey:process.env.RESEND_API_KEY}),from:process.env.METTELO_JOURNEY_EMAIL_FROM,recipientEmail:user.email,limit:5});
  return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Delivery could not be confirmed. Refresh the queue before retrying; uncertain outcomes are held.'},{status:502});}
}
