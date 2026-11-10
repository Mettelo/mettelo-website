const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function weeklyPulseEmail(job,{baseUrl='https://mettelo.com'}={}){
 const base=new URL(baseUrl);
 if(!['https://staging.mettelo.com','https://mettelo.com','http://127.0.0.1:3001','http://localhost:3001'].includes(base.origin)||base.pathname!=='/'||base.search||base.hash||base.username||base.password)throw Error('Unapproved Lab origin');
 if(!uuid.test(job.team_id)||!uuid.test(job.user_id)||!/^\d{4}-\d{2}-\d{2}$/.test(job.week_start)||!/^MTL-(DA|DE|DS|AI|XF|BA)-\d{3}$/.test(job.project_ref))throw Error('Invalid pulse identity');
 const number=value=>{if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid pulse count');return value;};
 const tasks=number(job.tasks_completed),milestones=number(job.milestones_completed),blockerCount=number(job.blocker_count);
 if(!Array.isArray(job.blockers)||job.blockers.some(v=>typeof v!=='string'))throw Error('Invalid blockers');
 const label=String(job.team_label||'Your project team').slice(0,80),url=base.origin+'/member/lab/'+job.team_id;
 const date=value=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))throw Error('Invalid reporting period');return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}).format(d);};
 const start=new Date(job.period_start),end=new Date(job.period_end);if(!(start<end)||end-start<6*86400000||end-start>8*86400000)throw Error('Invalid reporting window');
 const period=date(start)+' – '+date(new Date(end.getTime()-1));
 const progress=tasks||milestones?tasks+' '+(tasks===1?'task':'tasks')+' completed · '+milestones+' '+(milestones===1?'milestone':'milestones')+' accepted.':'No completed tasks or accepted milestones were recorded this week.';
 const next=typeof job.next_milestone==='string'&&job.next_milestone.trim()?job.next_milestone.slice(0,180):'No next milestone is recorded yet. Agree your next step in the Lab.';
 const blockers=job.blockers.slice(0,3).map(v=>v.slice(0,180));
 const blockerText=blockerCount?blockers.join('; ')+(blockerCount>blockers.length?' · '+(blockerCount-blockers.length)+' more in the Lab.':''):'No tasks are currently marked as blocked.';
 const subject='Your weekly project pulse · '+job.project_ref;
 const text=['METTELO LAB',subject,label,period,'Progress this week',progress,'Next recorded milestone',next,'Current blockers',blockerText,'Continue in your Lab: '+url,'One weekly update for this active project team. Open the Lab for the latest details.'].join('\n\n');
 const html='<div style="max-width:600px;margin:0 auto;font:15px/1.7 Arial,sans-serif;color:#18202e;background:#fcfaf5"><div style="padding:28px;background:#18202e;color:#f7efdd"><div style="font-size:12px;letter-spacing:2px">METTELO LAB</div><h1 style="font-size:28px;line-height:1.2;margin:16px 0">Your weekly project pulse</h1><p style="margin:0">'+escape(label)+' · '+escape(job.project_ref)+'</p></div><div style="padding:28px;border:1px solid #e4dfd3"><p style="font-size:12px;color:#626b76;margin:0 0 24px">'+escape(period)+'</p>'+[['Progress this week',progress],['Next recorded milestone',next],['Current blockers',blockerText]].map(([title,body])=>'<h2 style="font-size:17px;margin:24px 0 8px">'+title+'</h2><p style="margin:0 0 20px">'+escape(body)+'</p>').join('')+'<p style="margin:30px 0"><a href="'+escape(url)+'" style="display:inline-block;background:#18202e;color:white;text-decoration:none;padding:14px 22px;border-radius:8px">Continue in your Lab →</a></p><p style="font-size:12px;color:#626b76">One weekly update for this active project team. Open the Lab for the latest details.</p></div></div>';
 return {subject,text,html,idempotencyKey:'weekly-pulse/'+job.week_start+'/'+job.team_id+'/'+job.user_id};
}
export async function runWeeklyPulse({rpc,mode='disabled',baseUrl}={}){
 if(mode==='disabled')return {disabled:true,prepared:0,drafts:[]};
 if(!['preview','prepare'].includes(mode))throw Error('Weekly pulse delivery is not enabled');
 const jobs=await rpc(mode,{});if(!Array.isArray(jobs))throw Error('Invalid pulse snapshot');
 const seen=new Set();const drafts=jobs.map(job=>({job,mail:weeklyPulseEmail(job,{baseUrl})})).filter(({mail})=>{if(seen.has(mail.idempotencyKey))return false;seen.add(mail.idempotencyKey);return true;});
 return {disabled:true,prepared:mode==='prepare'?drafts.length:0,drafts};
}
