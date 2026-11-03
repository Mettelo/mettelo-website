import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {websiteProject} from '@/lib/project-catalogue';
import styles from './member-home.module.css';
export const dynamic='force-dynamic';
export default async function MemberHome({searchParams}:{searchParams:Promise<{profile?:string}>}){
  const params=await searchParams;
  const db=await createServerSupabaseClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)redirect('/signin');
  if(!user.email_confirmed_at)redirect('/auth/check-email');
  const {data:profile,error}=await db.from('profiles').select('full_name,username').eq('id',user.id).single();
  if(error)throw new Error('Your member identity could not be loaded. Please try again.');
  if(!profile.username)redirect('/onboarding');
  const [interests,saved]=await Promise.all([
    db.from('website_project_interests').select('id,project_ref,primary_role,submitted_at',{count:'exact'}).eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(3),
    db.from('saved_opportunities').select('opportunity_id',{count:'exact',head:true}).eq('user_id',user.id)
  ]);
  const website=process.env.NODE_ENV==='development'?'http://127.0.0.1:3002':'https://mettelo.com';
  const firstName=profile.full_name?.trim().split(/\s+/)[0]||'Member';
  const hasInterests=!interests.error&&Boolean(interests.count);
  return <section className={`${styles.home} ${styles.dailyHome} section`} aria-labelledby="member-home-title"><div className="shell">
    <header className={styles.dailyWelcome}><div><div className={styles.eyebrow}>My Mettelo · Home</div><h1 id="member-home-title">Good to see you, {firstName}.</h1><p>Pick up where you left off, or find your next step.</p></div><a className={`${styles.button} ${styles.buttonDark}`} href={hasInterests?'/member/applications':`${website}/projects/`}>{hasInterests?'Review your interests':'Explore projects'} <span aria-hidden="true">→</span></a></header>
    {params.profile==='saved'&&<p className={styles.savedNotice} role="status">Your private profile has been saved.</p>}
    <div className={styles.activityStrip} aria-label="Your activity"><a href="/member/applications"><span>Submitted project interests</span><strong>{interests.error?'Unavailable':interests.count??0}</strong><small>{interests.error?'Open your interests to try again':'Your recorded expressions of interest'}</small></a><a href="/member/saved-opportunities"><span>Saved opportunities</span><strong>{saved.error?'Unavailable':saved.count??0}</strong><small>{saved.error?'Open your shortlist to try again':'Return to roles you want to explore'}</small></a></div>
    <div className={styles.dailyGrid}><section className={styles.workPanel} aria-labelledby="your-work-title"><div className={styles.eyebrow}>Your next step</div><h2 id="your-work-title">{interests.error?'Your project interests':hasInterests?'Pick up your project interests':'Find your first project.'}</h2>
      {interests.error?<><p>Your project interests could not be loaded. Open your interests to try again.</p><a className={styles.button} href="/member/applications">Open project interests →</a></>:hasInterests?<><p>Revisit your recent submissions and the briefs behind them.</p><ul className={styles.recentInterests}>{interests.data?.map(item=><li key={item.id}><a href={`/member/projects/${item.project_ref}/interest`}><span><strong>{websiteProject(item.project_ref)?.name||item.project_ref}</strong><small>{item.primary_role||'Project interest'} · Submitted {new Date(item.submitted_at).toLocaleDateString('en-GB')}</small></span><span aria-hidden="true">→</span></a></li>)}</ul><p className={styles.quietNote}>Submitting interest does not confirm a team place.</p></>:<><p>Choose a real-world problem, explore the roles and find a place to put your skills into practice.</p><div className={styles.firstSteps}><span>01 · Explore a brief</span><span>02 · Find your role</span><span>03 · Submit interest</span></div><a className={`${styles.button} ${styles.buttonDark}`} href={`${website}/projects/`}>Find a project →</a><a className={styles.secondaryLink} href="/opportunities">Or browse career opportunities →</a></>}
    </section><aside className={styles.discoverPanel} aria-labelledby="discover-title"><div className={styles.eyebrow}>Discover & grow</div><h2 id="discover-title">More ways to move forward</h2><div className={styles.discoverLinks}><a href={`${website}/projects/`}><strong>Practical projects <span aria-hidden="true">↗</span></strong><span>Find a problem to solve with others.</span></a><a href="/opportunities"><strong>Career opportunities <span aria-hidden="true">→</span></strong><span>Discover roles for your next move.</span></a><a href={`${website}/start/`}><strong>Learning & community <span aria-hidden="true">↗</span></strong><span>Workshops, recordings, resources and peers.</span></a></div></aside></div>
    <footer className={styles.dailyFooter}><span>Your space to connect, build and grow.</span><a href={`${website}/contact/`}>Need help? Contact Mettelo →</a></footer>
  </div></section>;
}
