import {NextResponse} from 'next/server';
import {chatRead,chatWrite,chatError} from '@/lib/lab-chat';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const data=await chatRead(request);return NextResponse.json({items:data.items});}catch(error){const e=chatError(error);return NextResponse.json({error:e.message},{status:e.status});}}
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 try{return NextResponse.json(await chatWrite(request));}catch(error){const e=chatError(error);return NextResponse.json({error:e.message},{status:e.status});}
}
