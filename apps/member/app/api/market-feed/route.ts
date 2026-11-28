import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {communityRpc} from '@/lib/market-community';
import {feedReadQuery} from '@/lib/market-feed.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:Request){
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401,headers});
 let read;try{read=feedReadQuery(new URL(request.url).searchParams);}catch{return NextResponse.json({error:'This feed link is invalid.'},{status:400,headers});}
 try{return NextResponse.json(await communityRpc(db,read.action,read.payload),{headers});}
 catch{return NextResponse.json({error:read.action==='post'?'This discussion is unavailable.':'Posts could not load. Please try again.'},{status:503,headers});}
}
