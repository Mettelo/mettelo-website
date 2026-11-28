export function checkStagingEnvironment(env,{build=false}={}){
 const errors=[];const required=(key,value)=>{if(env[key]!==value)errors.push(key+' must be '+value);};
 required('METTELO_MEMBER_ENVIRONMENT','staging');required('NEXT_PUBLIC_SITE_ORIGIN','https://staging.mettelo.com');required('NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN','https://staging.mettelo.com');required('NEXT_PUBLIC_SUPABASE_URL','https://jxijdjmjuzslmjxolhjl.supabase.co');
 if(!env.NEXT_PUBLIC_SUPABASE_ANON_KEY||/YOUR|PLACEHOLDER/i.test(env.NEXT_PUBLIC_SUPABASE_ANON_KEY))errors.push('A staging publishable key is required');
 const key=env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
 if(key.startsWith('sb_secret_'))errors.push('A server secret cannot be used as a public key');
 if(key.split('.').length===3)try{if(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role!=='anon')errors.push('Public JWT key must have the anon role');}catch{errors.push('Malformed public JWT key');}
 if(!key.startsWith('sb_publishable_')&&key.split('.').length!==3)errors.push('Use a Supabase publishable or legacy anon key');
 for(const name of ['METTELO_PUBLIC_INDEXING_ENABLED','METTELO_LAB_EMAIL_ENABLED','METTELO_WEEKLY_PULSE_EMAIL_ENABLED','METTELO_PROJECT_EMAIL_ENABLED','NEXT_PUBLIC_AUTH_GOOGLE_ENABLED'])if(env[name]==='true')errors.push(name+' must stay disabled');
 if(env.METTELO_PUBLIC_SITE_ORIGIN)errors.push('Production SEO origin must be unset');
 for(const name of Object.keys(env))if(name.startsWith('NEXT_PUBLIC_')&&/SERVICE_ROLE|SECRET|PASSWORD|RESEND|TOKEN/.test(name))errors.push('Sensitive public variable refused: '+name);
 if(!build){if(!env.METTELO_STAGING_USERNAME||!/^[a-f0-9]{64}$/.test(env.METTELO_STAGING_PASSWORD_SHA256||''))errors.push('Staging access username and password hash are required');}
 return {ok:errors.length===0,errors};
}
if(process.argv[1]&&import.meta.url===(await import('node:url')).pathToFileURL(process.argv[1]).href){const result=checkStagingEnvironment(process.env,{build:process.argv.includes('--build')});console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
