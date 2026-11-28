import {NextResponse} from 'next/server';
import {chatRead,chatError} from '@/lib/lab-chat';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const data=await chatRead(request);return NextResponse.json({teams:data.teams});}catch(error){const e=chatError(error);return NextResponse.json({error:e.message},{status:e.status});}}
