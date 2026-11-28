import {NextResponse} from 'next/server';
import {labSession,labRpc} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export async function PATCH(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});
 const raw=await request.text();if(raw.length>8192)return NextResponse.json({error:'Request too large.'},{status:413});
 try{const input=JSON.parse(raw);const result=await labRpc(db,'task_status',{task_id:input.task_id,status:input.status,blocker_reason:input.blocker_reason,review_comment:input.review_comment});return NextResponse.json(result);}
 catch(error){const e=error as {code?:string;message?:string};return NextResponse.json({error:e.code==='P0001'?e.message:'This task could not be updated.'},{status:e.code==='42501'?403:409});}
}
