import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateProfilePatch} from '../apps/member/lib/profile-contract.mjs';

// Read-only RFC4180-style parser: quoted commas, escaped quotes and multiline fields.
export function parseTallyCsv(text){
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false,afterQuote=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted){if(char==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;afterQuote=true;}}else field+=char;continue;}
    if(char==='"'&&!field&&!afterQuote){quoted=true;continue;}
    if(char===','){row.push(field);field='';afterQuote=false;continue;}
    if(char==='\n'||char==='\r'){if(char==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';afterQuote=false;continue;}
    if(afterQuote)throw new Error('Unexpected text after a quoted CSV field.');
    if(char==='"')throw new Error('Unexpected quote in an unquoted CSV field.');
    field+=char;
  }
  if(quoted)throw new Error('CSV has an unfinished quoted field.');
  if(field||row.length){row.push(field);if(row.some(Boolean))rows.push(row);}
  if(!rows.length)throw new Error('CSV is empty.');
  const headers=rows.shift();
  if(new Set(headers).size!==headers.length)throw new Error('CSV has duplicate column headers.');
  for(const required of ['Submission ID','Email address','Country','City','Tell us about yourself'])if(!headers.includes(required))throw new Error(`Missing required column: ${required}`);
  return rows.map(values=>{if(values.length!==headers.length)throw new Error('CSV row has an unexpected column count.');return Object.fromEntries(headers.map((key,i)=>[key,values[i]]));});
}

function professionalLink(value,kind){
  if(!value)return '';
  let url;try{url=new URL(value)}catch{return '';}
  if(url.protocol!=='https:'||url.username||url.password||url.port)return '';
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  if(kind==='linkedin'&&(host!=='linkedin.com'||!/^\/(in|pub)\/[^/]+/.test(url.pathname)))return '';
  if(kind==='github'&&(host!=='github.com'||!/^\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/?$/.test(url.pathname)))return '';
  // Tracking/query fragments are unnecessary in profile links.
  url.search='';url.hash='';return url.toString();
}

export function planTallyImport(rows){
  const seenIds=new Set(),groups=new Map();
  const summary={submissions:rows.length,uniqueEmails:0,duplicateGroups:0,readyForPrivateReview:0,duplicateReviewRequired:0,omittedNameFields:0,invalidOrLongFields:0,githubConflicts:0};
  for(const row of rows){
    const id=String(row['Submission ID']||'').trim();
    if(!id||seenIds.has(id))throw new Error('Missing or repeated submission ID; review the source before importing.');
    seenIds.add(id);
    const email=String(row['Email address']||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Invalid email in source; no import plan produced.');
    if(!groups.has(email))groups.set(email,[]);
    groups.get(email).push(row);
  }
  summary.uniqueEmails=groups.size;
  const records=[];
  for(const [normalized_email,submissions] of groups){
    const needs_review=submissions.length>1;
    if(needs_review){summary.duplicateGroups++;summary.duplicateReviewRequired++;}
    else summary.readyForPrivateReview++;
    // Ambiguous "Basic Information" is deliberately not treated as a first name.
    summary.omittedNameFields+=submissions.filter(r=>r['Basic Information']||r['Last Name']).length;
    const draft={};
    if(!needs_review){
      const row=submissions[0];
      const add=(key,value)=>{value=String(value||'').trim();if(!value)return;try{Object.assign(draft,validateProfilePatch({[key]:value}));}catch{summary.invalidOrLongFields++;}};
      add('location',[row.City,row.Country].map(s=>String(s||'').trim()).filter(Boolean).join(', '));
      add('bio',row['Tell us about yourself']);
      // Goals were excluded from the initial basic activation mapping. Keep that boundary.
      const linkedInRaw=String(row['LinkedIn Profile']||'').trim();
      const linkedIn=professionalLink(linkedInRaw,'linkedin');
      if(linkedIn)add('linkedin_url',linkedIn);else if(linkedInRaw)summary.invalidOrLongFields++;
      const explicitRaw=String(row['GitHub Profile URL']||'').trim();
      const explicit=professionalLink(explicitRaw,'github');
      const usernameRaw=String(row['GitHub Username']||'').trim().replace(/^@/,'');
      const derived=usernameRaw?professionalLink(/^https:\/\//i.test(usernameRaw)?usernameRaw:`https://github.com/${usernameRaw}`,'github'):'';
      if(explicit&&derived&&new URL(explicit).pathname.toLowerCase().replace(/\/$/,'')!==new URL(derived).pathname.toLowerCase().replace(/\/$/,''))summary.githubConflicts++;
      else if(explicitRaw&&!explicit){summary.invalidOrLongFields++;} // Do not hide an invalid explicit URL behind another field.
      else if(explicit||derived)add('github_url',explicit||derived);
      else if(usernameRaw)summary.invalidOrLongFields++;
    }
    records.push({normalized_email,draft,needs_review,source_submission_ids:submissions.map(r=>r['Submission ID'])});
  }
  return {summary,records};
}

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const sourceIndex=process.argv.indexOf('--source');
  if(sourceIndex<0||!process.argv[sourceIndex+1])throw new Error('Pass --source with the original Tally CSV path. Default mode is a read-only dry run.');
  if(process.argv.includes('--apply'))throw new Error('This tool prepares only; database writes are not implemented or authorised.');
  const text=await fs.readFile(process.argv[sourceIndex+1],'utf8');
  const dataset_sha256=createHash('sha256').update(text).digest('hex');
  const plan=planTallyImport(parseTallyCsv(text));
  const privateIndex=process.argv.indexOf('--private-output');
  if(privateIndex>=0){
    const destination=path.resolve(process.argv[privateIndex+1]||'');
    const allowedRoot=path.join(root,'private-data');
    const relative=path.relative(allowedRoot,destination);
    if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Private plan must be inside this repository private-data directory.');
    await fs.mkdir(path.dirname(destination),{recursive:true});
    await fs.writeFile(destination,JSON.stringify({dataset_sha256,mode:'prepared-not-imported',...plan},null,2),{flag:'wx'});
  }
  console.log(JSON.stringify({mode:'dry-run',dataset_sha256,...plan.summary,accountsCreated:0,emailsSent:0,databaseWrites:0},null,2));
}
