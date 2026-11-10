import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401});
 try{const raw=await request.text();if(raw.length>2000)return NextResponse.json({error:'Request too large.'},{status:413});const body=JSON.parse(raw);
 if(!['status','link','enable','disable'].includes(body.action)||typeof body.team_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.team_id))return NextResponse.json({error:'Check the recruitment selection.'},{status:400});
 const {data,error}=await db.rpc('website_recruitment_sharing',{p_action:body.action,p_payload:{team_id:body.team_id,approved_public:body.approved_public===true}});
 if(error)return NextResponse.json({error:error.code==='42501'?'Only the active Lab leader can change public recruitment sharing.':error.code==='P0001'?error.message:'Recruitment sharing could not be confirmed.'},{status:error.code==='42501'?403:400});
 return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Check the recruitment details and try again.'},{status:400});}
}
