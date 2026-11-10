import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export async function GET(){try{const db=await createServerSupabaseClient();const {data,error}=await db.rpc('website_public_pilot_activity');return NextResponse.json(error?{error:'Activity temporarily unavailable.'}:{projects:data},{status:error?503:200,headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'Activity temporarily unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}}
