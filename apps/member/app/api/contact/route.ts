import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
import {validateContact} from '@/lib/contact-contract.mjs';
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin'))&&!(process.env.NODE_ENV==='development'&&request.headers.get('origin')==='http://127.0.0.1:3002'))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const raw=await request.text();if(raw.length>24000)return NextResponse.json({error:'Your message is too large.'},{status:413});
 let payload;try{const body=JSON.parse(raw);if(body.website)return NextResponse.json({error:'Please leave the website field empty.'},{status:400});payload=validateContact(body);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Check your enquiry details.'},{status:400});}
 const db=await createServerSupabaseClient();const {data,error}=await db.rpc('website_contact_submit',{p_payload:payload});
 if(error)return NextResponse.json({error:error.code==='P0001'?'We cannot accept another enquiry right now. Please try later or email hello@mettelo.com.':'Your enquiry could not be saved. Please try again.'},{status:error.code==='P0001'?429:503});
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
