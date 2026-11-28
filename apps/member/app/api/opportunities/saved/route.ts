import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';

const validId=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 const db=await createServerSupabaseClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user?.email_confirmed_at)return reply({error:'Sign in with a verified account first.'},401);
 const id=new URL(request.url).searchParams.get('opportunity_id');
 if(!validId(id))return reply({error:'A valid opportunity is required.'},400);
 const {data,error}=await db.from('saved_opportunities').select('opportunity_id').eq('user_id',user.id).eq('opportunity_id',id).maybeSingle();
 return error?reply({error:'Unable to check saved status. Please try again.'},503):reply({saved:Boolean(data)});
}
async function change(request:Request,remove:boolean){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return reply({error:'Invalid request origin.'},403);
 const db=await createServerSupabaseClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user?.email_confirmed_at)return reply({error:'Sign in with a verified account first.'},401);
 let id:unknown;
 try{const text=await request.text();if(text.length>1000)return reply({error:'Request is too large.'},413);const body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>key!=='opportunity_id'))throw new Error();id=body.opportunity_id;}catch{return reply({error:'Enter a valid opportunity.'},400);}
 if(!validId(id))return reply({error:'A valid opportunity is required.'},400);
 if(remove){
  const {error}=await db.from('saved_opportunities').delete().eq('user_id',user.id).eq('opportunity_id',id);
  return error?reply({error:'Unable to remove saved opportunity. Please try again.'},503):reply({saved:false,message:'Removed from saved opportunities.'});
 }
 const {data:item,error:readError}=await db.from('opportunities').select('id,closes_at').eq('id',id).eq('status','published').eq('access_level','public').eq('data_ai_relevance_status','high').maybeSingle();
 if(readError)return reply({error:'Opportunity data is temporarily unavailable.'},503);
 if(!item)return reply({error:'This opportunity is no longer available.'},404);
 if(item.closes_at&&Date.parse(item.closes_at)<=Date.now())return reply({error:'This opportunity has closed.'},409);
 const {error}=await db.from('saved_opportunities').upsert({user_id:user.id,opportunity_id:id},{onConflict:'user_id,opportunity_id',ignoreDuplicates:true});
 return error?reply({error:'This opportunity could not be saved. Refresh and try again.'},409):reply({saved:true,message:'Saved to your opportunities.'});
}
export async function POST(request:Request){return change(request,false);}
export async function DELETE(request:Request){return change(request,true);}
