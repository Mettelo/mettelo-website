import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
// Offline validation only. No database client, credentials, account creation or mail.
export function checkMigrationManifest(m,catalogue){
 const fail=message=>{throw Error(message);};
 if(m?.version!==1||m.target!=='isolated-staging'||m.notifications!=='disabled')fail('Use version 1, isolated-staging and notifications disabled.');
 if(m.mappingApproved!==true)fail('Account and project mapping needs approval.');
 if(!Array.isArray(m.sources)||m.sources.length!==2)fail('Both source exports are required.');
 const sources=new Map();
 for(const s of m.sources){if(!/^[a-z0-9-]{1,40}$/.test(s.id)||sources.has(s.id)||!/^[a-f0-9]{64}$/.test(s.sha256)||!Number.isSafeInteger(s.rowCount)||s.rowCount<1)fail('Invalid source identity, hash or row count.');sources.set(s.id,{...s,seen:0});}
 if(!Array.isArray(m.accounts)||!m.accounts.length)fail('Review the consolidated accounts first.');
 const emails=new Set(),records=new Set(),projects=new Set(catalogue.map(p=>p.id)),teams=new Map();let placements=0;
 for(const account of m.accounts){
  if(typeof account.email!=='string'||account.email!==account.email.trim().toLowerCase()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)||emails.has(account.email))fail('Each account needs one unique, normalised email.');emails.add(account.email);
  if(account.profileApproved!==true||!Array.isArray(account.sourceRecords)||!account.sourceRecords.length)fail('Every profile and its source records need review.');
  if(account.sourceRecords.length>1&&account.mergeApproved!==true)fail('Resolve duplicate submissions before migration.');
  for(const r of account.sourceRecords){if(!r||!sources.has(r.source)||typeof r.id!=='string'||!r.id.trim())fail('Unmapped source record.');const key=JSON.stringify([r.source,r.id]);if(records.has(key))fail('A source record is mapped more than once.');records.add(key);sources.get(r.source).seen++;}
  if(!Array.isArray(account.placements))fail('Explicitly list placements, including an empty list for non-project members.');
  const memberProjects=new Set();
  for(const p of account.placements){
   if(!projects.has(p.projectRef)||typeof p.teamKey!=='string'||!p.teamKey.trim()||p.teamKey.length>100||!['forming','active','paused','completed'].includes(p.status)||typeof p.role!=='string'||!p.role.trim()||typeof p.coordinator!=='boolean'||memberProjects.has(p.projectRef))fail('Project placement mapping needs review.');memberProjects.add(p.projectRef);
   const key=JSON.stringify([p.projectRef,p.teamKey]);const t=teams.get(key)||{status:p.status,coordinators:0};if(t.status!==p.status)fail('Team status differs between mapped members.');t.coordinators+=Number(p.coordinator);teams.set(key,t);placements++;
  }
 }
 for(const s of sources.values())if(s.seen!==s.rowCount)fail('Source row counts do not reconcile. Resolve exclusions explicitly before producing the final manifest.');
 for(const t of teams.values())if(t.coordinators!==1)fail('Every team needs exactly one reviewed coordinator or solo owner.');
 return {mode:'validation-only',sources:sources.size,sourceRecords:records.size,accounts:emails.size,teams:teams.size,placements,databaseWrites:0,accountsCreated:0,emailsSent:0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--apply'))throw Error('Validation only. Import execution is not implemented or authorised.');
 const i=process.argv.indexOf('--manifest');if(i<0||!process.argv[i+1])throw Error('Pass --manifest with the reviewed private mapping JSON.');
 const manifest=JSON.parse(await readFile(process.argv[i+1],'utf8'));
 const catalogue=JSON.parse(await readFile(new URL('../content/project-catalogue.json',import.meta.url),'utf8'));
 const result=checkMigrationManifest(manifest,catalogue);const paths=new Map();
 for(let i=0;i<process.argv.length;i++)if(process.argv[i]==='--source'){const value=process.argv[++i]||'',split=value.indexOf('=');if(split<1)throw Error('Use --source source-id=private-file-path for each export.');const id=value.slice(0,split);if(paths.has(id))throw Error('Repeated source file.');paths.set(id,value.slice(split+1));}
 if(paths.size!==2)throw Error('Provide both original exports to verify source checksums.');
 for(const source of manifest.sources){if(!paths.has(source.id))throw Error('Missing original export.');const hash=createHash('sha256').update(await readFile(paths.get(source.id))).digest('hex');if(hash!==source.sha256)throw Error('Source checksum mismatch. Review a fresh mapping before proceeding.');}
 console.log(JSON.stringify({...result,sourceChecksumsVerified:true},null,2));
}
