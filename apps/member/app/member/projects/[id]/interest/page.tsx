import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import {applicationStatuses} from '@/lib/application-status-server';
import {applicationStatus} from '@/lib/application-status.mjs';
import {completionColumns,profileCompletion} from '@/lib/profile-completion.mjs';
import {notFound,redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {resolveWebsiteProject} from '@/lib/market-proposals';
import InterestFlow from '@/components/MemberProjectInterestFlow';
export default async function ProjectInterest({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();
 if(!user?.email_confirmed_at)redirect(`/signin?next=${encodeURIComponent(`/member/projects/${id}/interest`)}`);
 const project=await resolveWebsiteProject(db,id);if(!project)notFound();
 const {data:profileData,error:profileError}=await db.from('profiles').select('username,skills,weekly_availability,'+completionColumns).eq('id',user.id).single();
 if(profileError)throw new Error('Your profile could not be loaded. Please try again.');
 const profile=profileData as unknown as Record<string,unknown>|null;
 if(!profile?.username)redirect('/onboarding');
 const {data:existing,error}=await db.from('website_project_interests').select('id,participation,primary_role,motivation,contribution,submitted_at').eq('user_id',user.id).eq('project_ref',project.id).maybeSingle();
 if(error)throw new Error('Project interest could not be loaded. Please try again.');
 const status=existing?applicationStatus((await applicationStatuses(db)).get(existing.id)||'unavailable'):null;
 const website=publicWebsiteOrigin();
 const completion=profileCompletion(profile||{});
 return <section className="section interestDetail"><div className="shell"><a className="interestBack" href="/member/applications">← Your project applications</a><div className="eyebrow">Project application · {project.id}</div><h1>{project.name}</h1><p>{project.brief}</p>{existing?<div className="panel"><span className="collectionBadge">{status?.label}</span><h2>Your application</h2><p>{status?.message}</p>{status?.href&&<p><a href={status.href==='projects'?`${website}/projects/`:status.href==='/contact/'?`${website}/contact/`:status.href}>{status.action} →</a></p>}<p>{existing.participation}{existing.primary_role?` · ${existing.primary_role}`:null}</p><h3>Your motivation</h3><p>{existing.motivation}</p><h3>Your contribution</h3><p>{existing.contribution}</p><p>Submitted {new Date(existing.submitted_at).toLocaleDateString('en-GB')}. <a href={`${website}/contact/`}>Contact Mettelo</a> to amend or withdraw your application.</p><a href="/member/applications">View your project applications →</a></div>:!completion.eligible?<div className="panel"><h2>One step before submitting</h2><p>Your saved profile is {completion.percent}% complete. You need at least 80% (eight of ten items).</p><progress value={completion.percent} max={100} aria-label="Saved profile completion"/><p>Choose from the missing items below. A photo or social link is not compulsory.</p><ul>{completion.items.filter(item=>!item.complete).map(item=><li key={String(item.key)}>{item.label}</li>)}</ul><a className="button dark" href={`/member/profile?next=${encodeURIComponent(`/member/projects/${project.id}/interest`)}`}>Complete your profile →</a><p>After saving, you will return here to continue.</p></div>:<><p className="collectionNotice">Five steps: participation, contribution, availability, fit and review. You can go back before submitting. Submission does not confirm a place, role, team or start date. Commitment and source-data permissions must be agreed before work begins.</p><InterestFlow project={{id:project.id,title:project.name,commitment:null,participationMode:'flexible'}} roles={project.roles.map(title=>({id:title,title,description:null,openings:0,roleStatus:'unconfirmed'}))} profileSkills={typeof profile.skills==='string'?profile.skills.split(',').map(skill=>skill.trim()).filter(Boolean):[]} initialAvailability={typeof profile.weekly_availability==='string'?profile.weekly_availability:''} initialPortfolioUrl={typeof profile?.portfolio_url==='string'?profile.portfolio_url:''}/></>}</div></section>;
}
