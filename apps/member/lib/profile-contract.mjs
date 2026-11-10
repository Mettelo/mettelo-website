import {validateHistory} from './profile-history.mjs';
// Field names, taxonomy and bounds transferred from the platform profile API.
export const professionalAreas=['Data Analysis / BI','Data Science / ML','Data Engineering','AI / Generative AI','Analytics Engineering','Research / Product / Design','Career transition / Student','Other'];
export const profileFields=[
  {key:'full_name',label:'Full name',max:120,required:true},
  {key:'headline',label:'Professional headline',max:160},
  {key:'location',label:'City and country',max:120},
  {key:'professional_area',label:'Professional area',max:80,options:professionalAreas},
  {key:'current_job_title',label:'Current role',max:140},
  {key:'organisation',label:'Organisation',max:160},
  {key:'experience_level',label:'Experience level',max:20,options:['entry','mid','senior','lead','executive']},
  {key:'bio',label:'About you',max:1000,multiline:true},
  {key:'primary_goal',label:'What would you like to achieve with Mettelo?',max:200},
  {key:'linkedin_url',label:'LinkedIn profile URL',max:300,url:true},
  {key:'github_url',label:'GitHub profile URL',max:300,url:true},
  {key:'portfolio_url',label:'Portfolio URL',max:300,url:true},
  {key:'skills',label:'Skills and tools',max:400},
  {key:'technical_interests',label:'Technical interests',max:400},
  {key:'preferred_roles',label:'Preferred project roles',max:240},
  {key:'weekly_availability',label:'Weekly project availability',max:40,options:['Not sure yet','Less than 2 hours','2–4 hours','5–8 hours','9–12 hours','More than 12 hours']},
  {key:'problem_interests',label:'Problems you would like to solve',max:400},
  {key:'education_qualification',label:'Qualification or degree',max:160},
  {key:'education_institution',label:'School, college or university',max:200},
  {key:'education_subject',label:'Field of study',max:160},
  {key:'education_period',label:'Dates attended',max:80},
  {key:'education_additional',label:'Additional education and learning',max:1500,multiline:true},
  {key:'community_contribution',label:'What would you like to contribute?',max:1000,multiline:true}
];
export const profileColumns=['id','username','member_id','profile_version','profile_completed_at',...profileFields.map(f=>f.key),'education_entries','experience_entries'].join(',');
export function validateProfilePatch(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Enter valid profile details.');
  const patch={};
  for(const [key,raw] of Object.entries(input)){
    if(key==='education_entries'||key==='experience_entries'){patch[key]=validateHistory(raw,key);continue;}
    const field=profileFields.find(f=>f.key===key);
    if(!field)throw new Error('This profile field cannot be changed.');
    if(typeof raw!=='string')throw new Error(`${field.label} must be text.`);
    const value=raw.trim();
    if(value.length>field.max)throw new Error(`${field.label} is too long.`);
    if(field.required&&!value)throw new Error(`${field.label} is required.`);
    if(field.options&&value&&!field.options.includes(value))throw new Error(`Choose a valid ${field.label.toLowerCase()}.`);
    if(field.url&&value){let url;try{url=new URL(value)}catch{throw new Error(`${field.label} must be a valid HTTPS URL.`)}if(url.protocol!=='https:'||!url.hostname||url.username||url.password)throw new Error(`${field.label} must be a valid HTTPS URL without login details.`);}
    patch[key]=value;
  }
  return patch;
}
export function fillEmptyProfile(current,draft){
  const result={...current};
  for(const field of profileFields){if(!String(result[field.key]||'').trim()&&typeof draft[field.key]==='string'){try{result[field.key]=validateProfilePatch({[field.key]:draft[field.key]})[field.key]}catch{/* Keep invalid historical values out of the editable draft. */}}}
  return result;
}
