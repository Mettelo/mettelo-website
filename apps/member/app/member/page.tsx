import {redirect} from 'next/navigation';
import {Suspense} from 'react';
import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {completionColumns,profileCompletion} from '@/lib/profile-completion.mjs';
import {memberHome} from '@/lib/member-home.mjs';
import {memberHomePreview,exampleProgressWorkspaces} from '@/lib/member-home-preview';
import {progressCards,memberProgress} from '@/lib/member-progress.mjs';
import type {LabCard} from '@/lib/lab';
import HomeCommunity,{HomeCommunityLoading} from './HomeCommunity';
import HomeDashboard,{HomeDashboardSkeleton} from './HomeDashboard';
export const dynamic='force-dynamic';
type Params={profile?:string;preview?:string};
export default async function MemberHomePage({searchParams}:{searchParams:Promise<Params>}){
 const params=await searchParams,db=await createServerSupabaseClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/signin?next=%2Fmember');
 if(!user.email_confirmed_at)redirect('/auth/check-email');
 const {data,error}=await db.from('profiles').select('username,'+completionColumns).eq('id',user.id).single();
 if(error||!data)throw new Error('Your member identity could not be loaded. Please try again.');
 const profile=data as unknown as Record<string,unknown>;
 if(!profile.username)redirect('/onboarding');
 return <Suspense fallback={<HomeDashboardSkeleton/>}><HomeContent db={db} profile={profile} userId={user.id} params={params}/></Suspense>;
}
async function HomeContent({db,profile,userId,params}:{db:Awaited<ReturnType<typeof createServerSupabaseClient>>;profile:Record<string,unknown>;userId:string;params:Params}){
 const [interests,lab]=await Promise.all([
  db.from('website_project_interests').select('id,project_ref,primary_role,submitted_at',{count:'exact'}).eq('user_id',userId).order('submitted_at',{ascending:false}).limit(3),
  db.rpc('website_lab',{p_action:'mine'})
 ]);
 const example=process.env.NODE_ENV==='development'?memberHomePreview(params.preview):null;
 const input=example||{cards:Array.isArray(lab.data)?lab.data as LabCard[]:[],applications:interests.data||[],applicationCount:interests.count??0,profilePercent:profileCompletion(profile).percent,labFailed:Boolean(lab.error)||!Array.isArray(lab.data),applicationsFailed:Boolean(interests.error)};
 const recognition=example?{data:params.preview==='progress'?{milestones:4,milestones_month:2,delivered:1,skills:3}:{milestones:0,milestones_month:0,delivered:0,skills:0},error:input.labFailed}:await db.rpc('website_member_home',{p_action:'progress'});
 const workspaces=example?exampleProgressWorkspaces(input.cards):recognition.error?[]:progressCards(input.cards).map(card=>({team_id:card.team_id,items:recognition.data?.next?.team_id===card.team_id?[recognition.data.next]:[]}));
 const progress=memberProgress({cards:input.cards,workspaces,userId:example?'example-member':userId,labFailed:input.labFailed});
 const home=memberHome({...input,progress});
 const value=(key:string):number|null=>!recognition.error&&Number.isSafeInteger(recognition.data?.[key])&&recognition.data[key]>=0?recognition.data[key]:null;
 const metrics=[{label:'Active projects',value:progress.activeProjects},{label:'Milestones accepted',value:value('milestones')},{label:'Projects delivered',value:value('delivered')},{label:'Skills practised',value:value('skills')}];
 const firstName=example?'Example member':String(profile.full_name||'Member').trim().split(/\s+/)[0]||'Member';
 return <HomeDashboard home={home} cards={input.cards} applications={input.applications} applicationCount={input.applicationCount} applicationsFailed={input.applicationsFailed} labFailed={input.labFailed} metrics={metrics} progressUnavailable={progress.unavailable||Boolean(recognition.error)} firstName={firstName} website={publicWebsiteOrigin()} example={Boolean(example)} profileSaved={params.profile==='saved'&&!example} community={example?null:<Suspense fallback={<HomeCommunityLoading/>}><HomeCommunity db={db} showAction={!(['profile','explore'].includes(home.primary.kind))}/></Suspense>}/>;
}
