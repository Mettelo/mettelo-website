import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const project='jxijdjmjuzslmjxolhjl';
const definitions=[['confirmation','confirmation.html','Verify your email address | Mettelo'],['recovery','recovery.html','Reset your Mettelo password']];
const payload={};
for(const [kind,file,subject] of definitions){
  const html=await fs.readFile(path.join(root,'supabase/templates/auth',file),'utf8');
  if(!html.includes('href="{{ .ConfirmationURL }}"')||html.includes('http://127.0.0.1')||html.includes('aconptuqupsgznyrxhrh')||html.includes('{{ .SiteURL }}/mettelo-logo'))throw new Error(`Unsafe or incomplete template: ${file}`);
  payload[`mailer_subjects_${kind}`]=subject;
  payload[`mailer_templates_${kind}_content`]=html;
}
if(!process.argv.includes('--apply')){
  console.log('Validated signup and recovery templates locally; no hosted changes.');
  process.exit(0);
}
if(process.env.SUPABASE_PROJECT_REF!==project)throw new Error('Explicit isolated staging project ref required. Production is refused.');
if(!process.env.SUPABASE_ACCESS_TOKEN)throw new Error('Supabase management access token required; never use a browser/service-role key here.');
const headers={Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'};
const endpoint=`https://api.supabase.com/v1/projects/${project}/config/auth`;
const result=await fetch(endpoint,{method:'PATCH',headers,body:JSON.stringify(payload)});
if(!result.ok)throw new Error(`Template update failed (HTTP ${result.status}).`);
const verification=await fetch(endpoint,{headers});
if(!verification.ok)throw new Error(`Template readback failed (HTTP ${verification.status}).`);
const live=await verification.json();
for(const [key,value] of Object.entries(payload))if(live[key]!==value)throw new Error(`Template readback mismatch: ${key}`);
console.log('Verified signup/recovery templates in isolated staging. No feature switches changed.');
