import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runWeeklyPulse,weeklyPulseEmail} from '../lib/lab-weekly-pulse.mjs';
const args=process.argv.slice(2);
if(args.some(a=>!['--preview','--prepare','--sample'].includes(a))||args.length>1)throw Error('Use one of --sample, --preview or --prepare. Sending is unavailable.');
if(process.env.METTELO_WEEKLY_PULSE_EMAIL_ENABLED==='true')throw Error('Weekly pulse sending is not implemented or enabled.');
const mode=args[0];
if(!mode){console.log('Weekly pulse is disabled. No database writes or emails sent. Use --sample for a fictional preview.');process.exit(0);}
let drafts;
if(mode==='--sample'){
 const job={team_id:'11111111-1111-4111-8111-111111111111',user_id:'22222222-2222-4222-8222-222222222222',week_start:'2026-11-02',project_ref:'MTL-DA-001',team_label:'Example team — fictional preview',period_start:'2026-10-26T00:00:00Z',period_end:'2026-11-02T00:00:00Z',tasks_completed:3,milestones_completed:1,next_milestone:'Complete the first dashboard prototype',blockers:['Agree the final set of reporting measures'],blocker_count:1};
 drafts=[{job,mail:weeklyPulseEmail(job,{baseUrl:'http://127.0.0.1:3001'})}];
}else{
 try{process.loadEnvFile('.env.lab-mail.local');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(process.env.METTELO_WEEKLY_PULSE_EMAIL_ENABLED==='true')throw Error('Weekly pulse sending is disabled by design.');
 const url=process.env.METTELO_LAB_SUPABASE_URL,key=process.env.METTELO_LAB_SERVICE_ROLE_KEY;
 if(url!=='https://jxijdjmjuzslmjxolhjl.supabase.co'||!key)throw Error('Explicit staging URL and server-only credential required. Production is refused.');
 const {createClient}=await import('@supabase/supabase-js');const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const rpc=async(action)=>{const {data,error}=await db.rpc('website_lab_weekly_pulse',{p_action:action});if(error)throw Error('Weekly pulse preparation failed.');return data;};
 ({drafts}=await runWeeklyPulse({rpc,mode:mode.slice(2),baseUrl:'http://127.0.0.1:3001'}));
}
const target=resolve('.weekly-pulse-preview');await mkdir(target,{recursive:true});
for(const {job,mail} of drafts){const stem=job.week_start+'-'+job.team_id+'-'+job.user_id;await writeFile(resolve(target,stem+'.html'),mail.html);await writeFile(resolve(target,stem+'.txt'),mail.text);}
console.log(JSON.stringify({mode,previews:drafts.length,sent:0,deliveryEnabled:false,directory:target}));
