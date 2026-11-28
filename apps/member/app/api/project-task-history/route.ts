import {NextResponse} from 'next/server';
import {labSession,labRpc} from '@/lib/lab';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});
 try{return NextResponse.json({items:await labRpc(db,'task_history',{task_id:new URL(request.url).searchParams.get('task_id')})});}
 catch{return NextResponse.json({error:'Task access required.'},{status:403});}
}
