import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runProjectEmailPreviews,sampleProjectEmails} from '../lib/project-email-previews.mjs';
const args=process.argv.slice(2);
if(args.length>1||args.some(a=>!['--sample','--preview'].includes(a)))throw Error('Use --sample or --preview. Delivery is unavailable.');
if(process.env.METTELO_PROJECT_EMAIL_ENABLED==='true')throw Error('Project email delivery is disabled by design.');
if(!args.length){console.log('Project email delivery is disabled. No database or provider calls.');process.exit(0);}
let rpc;
if(args[0]==='--sample')rpc=async()=>sampleProjectEmails();
else{
 try{process.loadEnvFile('.env.lab-mail.local');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(process.env.METTELO_PROJECT_EMAIL_ENABLED==='true')throw Error('Project email delivery is disabled by design.');
 const url=process.env.METTELO_LAB_SUPABASE_URL,key=process.env.METTELO_LAB_SERVICE_ROLE_KEY;
 if(url!=='https://jxijdjmjuzslmjxolhjl.supabase.co'||!key)throw Error('Explicit staging URL and server-only credential required. Production is refused.');
 const {createClient}=await import('@supabase/supabase-js');const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 rpc=async()=>{const {data,error}=await db.rpc('website_project_email_previews',{p_limit:100});if(error)throw Error('Project email preview failed.');return data;};
}
const {previews}=await runProjectEmailPreviews({rpc,enabled:true,baseUrl:'http://127.0.0.1:3001'});
const target=resolve('.project-email-previews');await mkdir(target,{recursive:true});
for(const {job,mail}of previews){await writeFile(resolve(target,job.id+'-'+job.kind+'.html'),mail.html);await writeFile(resolve(target,job.id+'-'+job.kind+'.txt'),mail.text);}
console.log(JSON.stringify({deliveryEnabled:false,sent:0,previews:previews.length,directory:target}));
