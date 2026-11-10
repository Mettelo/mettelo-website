import {completionColumns,profileCompletion} from '@/lib/profile-completion.mjs';
import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
import {resolveWebsiteProject} from '@/lib/market-proposals';
import {PROJECT_PARTICIPATION_TERMS_VERSION} from '@/lib/project-participation-terms';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const fields=new Set(['interest_form_version','coordination_preference','coordination_example','coordination_approach','time_zone','earliest_start','team_formation_preference','project_id','application_kind','participation_preference','flexible_preference','project_role_id','secondary_project_role_id','role_fit_statement','leadership_interest','contribution_areas','commitment_response','availability','availability_note','collaboration_availability','motivation_statement','relevant_skills','contribution_statement','portfolio_url','collaboration_need_id','terms_accepted','terms_version']);
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return reply({error:'Invalid request origin.'},403);
 const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();
 if(!user?.email_confirmed_at)return reply({error:'Verify your email and sign in first.'},401);
 let body:Record<string,unknown>;
 try{
  const text=await request.text();if(text.length>18000)return reply({error:'Your response is too long.'},413);
  body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!fields.has(key)))throw new Error();
  if(body.team_formation_preference!==undefined&&!['join_forming','form_new','either'].includes(String(body.team_formation_preference)))throw new Error('Choose a valid team formation preference.');
  if(body.terms_accepted!==true||body.terms_version!==PROJECT_PARTICIPATION_TERMS_VERSION)throw new Error('Read and accept the current participation terms.');
  if(!['solo','team','flexible'].includes(String(body.participation_preference)))throw new Error();
  for(const [key,max] of Object.entries({coordination_example:1200,coordination_approach:1200,time_zone:80,earliest_start:10,role_fit_statement:1200,availability:160,availability_note:500,collaboration_availability:500,motivation_statement:2000,contribution_statement:3000,portfolio_url:500})){
   if(body[key]!==null&&body[key]!==undefined&&(typeof body[key]!=='string'||String(body[key]).length>max))throw new Error('Check the length of your responses.');
  }
  if(String(body.motivation_statement||'').trim().length<20||String(body.contribution_statement||'').trim().length<40)throw new Error('Explain your motivation and contribution in more detail.');
  if(!['yes','yes_with_limitations','no'].includes(String(body.commitment_response)))throw new Error('Confirm your availability.');
  if(typeof body.leadership_interest!=='boolean')throw new Error();
  if(body.interest_form_version===2){
   if(body.participation_preference==='team'&&String(body.role_fit_statement||'').trim().length<20)throw Error('Explain the responsibility you could own in this role.');
   if(!['comfortable','interested_with_support','contributor'].includes(String(body.coordination_preference)))throw Error('Choose your coordination preference.');
   if(!String(body.availability||'').trim()||!String(body.time_zone||'').trim()||!/^\d{4}-\d{2}-\d{2}$/.test(String(body.earliest_start||''))||Number.isNaN(Date.parse(String(body.earliest_start))))throw Error('Confirm availability, time zone and earliest start.');
   if(body.participation_preference!=='solo'&&!String(body.collaboration_availability||'').trim())throw Error('Add your collaboration windows.');
   const interested=body.participation_preference!=='solo'&&body.coordination_preference!=='contributor';
   if(body.leadership_interest!==interested)throw Error('Check your coordination preference.');
   if(interested&&(String(body.coordination_example||'').trim().length<20||String(body.coordination_approach||'').trim().length<20))throw Error('Add a coordination example and approach.');
  }
  for(const key of ['contribution_areas','relevant_skills'])if(!Array.isArray(body[key])||body[key].length>20||body[key].some(value=>typeof value!=='string'||value.length>100))throw new Error();
  if(body.portfolio_url){const url=new URL(String(body.portfolio_url));if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use an HTTPS portfolio link.');}
 }catch(error){return reply({error:error instanceof Error&&error.message&&!(error instanceof SyntaxError)&&error.message!=='Invalid URL'?error.message:'Check your responses and try again.'},400);}
 let project;try{project=typeof body.project_id==='string'?await resolveWebsiteProject(db,body.project_id):null;}catch{return reply({error:'This project is temporarily unavailable.'},503);}if(!project)return reply({error:'This project is unavailable.'},404);
 const role=body.participation_preference==='solo'?null:body.project_role_id||null;
 if((body.participation_preference==='team'&&!role)||(role&&!project.roles.includes(String(role)))||(body.secondary_project_role_id&&(!project.roles.includes(String(body.secondary_project_role_id))||body.secondary_project_role_id===role)))return reply({error:'Choose a role from this project.'},400);
 const {data:profileData,error:profileError}=await db.from('profiles').select('username,'+completionColumns).eq('id',user.id).maybeSingle();
 const profile=profileData as unknown as Record<string,unknown>|null;
 if(profileError)return reply({error:'Your profile could not be checked. Try again.'},503);
 if(!profile?.username)return reply({error:'Complete your member identity before submitting.'},409);
 const completion=profileCompletion(profile||{});if(!completion.eligible)return reply({error:'Complete at least 80% of your profile before submitting project interest.',code:'PROFILE_INCOMPLETE',completion:completion.percent,required:80},403);
 const {data:brief,error:briefError}=await db.from('website_project_briefs').select('intake_open').eq('project_ref',project.id).maybeSingle();
 if(briefError)return reply({error:'Project interest is temporarily unavailable.'},503);
 if(!brief?.intake_open)return reply({error:'This project is not accepting interest.'},409);
 const {data,error}=await db.from('website_project_interests').insert({user_id:user.id,project_ref:project.id,participation:body.participation_preference,primary_role:role,motivation:String(body.motivation_statement).trim(),contribution:String(body.contribution_statement).trim(),answers:body,terms_version:PROJECT_PARTICIPATION_TERMS_VERSION}).select('id').single();
 if(error?.code==='23505'){const existing=await db.from('website_project_interests').select('id').eq('user_id',user.id).eq('project_ref',project.id).maybeSingle();if(existing.data)return reply({application:{id:existing.data.id}});}
 return error?reply({error:'Your interest could not be saved. Your responses are still here; please try again.'},503):reply({application:{id:data.id}});
}
