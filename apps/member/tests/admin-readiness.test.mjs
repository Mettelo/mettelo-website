import test from 'node:test';
import assert from 'node:assert/strict';
import {publicIndexingEnabled,indexingHeaders,publicRobots} from '../lib/seo-policy.mjs';
import {checkMigrationManifest} from '../../../scripts/validate-member-migration.mjs';
test('public indexing requires both explicit release gates and never broadens private routes',()=>{
 for(const env of [{},{METTELO_PUBLIC_INDEXING_ENABLED:'true'},{METTELO_PUBLIC_SITE_ORIGIN:'https://mettelo.com'},{METTELO_PUBLIC_INDEXING_ENABLED:'true',METTELO_PUBLIC_SITE_ORIGIN:'https://preview.mettelo.com'}]){assert.equal(publicIndexingEnabled(env),false);assert.deepEqual(publicRobots(env),{index:false,follow:false});assert.equal(indexingHeaders(env).length,1);}
 const env={METTELO_PUBLIC_INDEXING_ENABLED:'true',METTELO_PUBLIC_SITE_ORIGIN:'https://mettelo.com'};const headers=indexingHeaders(env);assert.deepEqual(publicRobots(env),{index:true,follow:true});assert.equal(headers[0].headers.find(h=>h.key==='X-Robots-Tag').value,'noindex, nofollow');assert.deepEqual(headers.slice(1).map(h=>h.source),['/industry-news/:path*','/opportunities']);
});
const fixture=()=>({version:1,target:'isolated-staging',notifications:'disabled',mappingApproved:true,sources:[{id:'members',sha256:'a'.repeat(64),rowCount:1},{id:'projects',sha256:'b'.repeat(64),rowCount:1}],accounts:[{email:'fixture@example.invalid',profileApproved:true,mergeApproved:true,sourceRecords:[{source:'members',id:'1'},{source:'projects',id:'2'}],placements:[{projectRef:'P',teamKey:'team-a',status:'active',role:'Analyst',coordinator:true}]}]});
test('reviewed migration manifest reconciles both exports without any writes or email',()=>{assert.deepEqual(checkMigrationManifest(fixture(),[{id:'P'}]),{mode:'validation-only',sources:2,sourceRecords:2,accounts:1,teams:1,placements:1,databaseWrites:0,accountsCreated:0,emailsSent:0});});
test('migration rejects unapproved merges, incomplete source coverage and unresolved placements',()=>{
 for(const change of [m=>m.mappingApproved=false,m=>m.notifications='enabled',m=>m.target='production',m=>m.accounts[0].mergeApproved=false,m=>m.sources[0].rowCount=2,m=>m.accounts[0].placements[0].coordinator=false,m=>m.accounts[0].placements[0].projectRef='UNKNOWN',m=>m.accounts.push(structuredClone(m.accounts[0])),m=>m.accounts[0].sourceRecords.push({source:'members',id:'1'})]){const m=fixture();change(m);assert.throws(()=>checkMigrationManifest(m,[{id:'P'}]));}
});

// A server module sharing a basename with a pure .mjs helper resolves differently across bundlers.
test('server modules have unambiguous names across Webpack and Turbopack',async()=>{const {readdir,readFile,access}=await import('node:fs/promises');const dir=new URL('../lib/',import.meta.url);for(const file of await readdir(dir)){if(!file.endsWith('.ts'))continue;const text=await readFile(new URL(file,dir),'utf8');if(!text.includes("import 'server-only'"))continue;let collision=false;try{await access(new URL(file.replace(/\.ts$/,'.mjs'),dir));collision=true;}catch{}assert.equal(collision,false,'Server/helper basename collision: '+file);}});

test('offline migration CLI verifies both original checksums and refuses apply',async()=>{
 const {mkdtemp,writeFile,unlink,rmdir}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {createHash}=await import('node:crypto');const {execFileSync}=await import('node:child_process');const {fileURLToPath}=await import('node:url');
 const dir=await mkdtemp(join(tmpdir(),'mettelo-migration-check-'));const m=fixture();m.accounts[0].placements[0].projectRef='MTL-DA-001';const manifest=join(dir,'manifest.json'),members=join(dir,'members.csv'),projects=join(dir,'projects.csv');
 try{await writeFile(members,'Synthetic member export');await writeFile(projects,'Synthetic project export');m.sources[0].sha256=createHash('sha256').update('Synthetic member export').digest('hex');m.sources[1].sha256=createHash('sha256').update('Synthetic project export').digest('hex');await writeFile(manifest,JSON.stringify(m));
  const cli=fileURLToPath(new URL('../../../scripts/validate-member-migration.mjs',import.meta.url));const args=[cli,'--manifest',manifest,'--source','members='+members,'--source','projects='+projects];const result=JSON.parse(execFileSync(process.execPath,args,{encoding:'utf8'}));assert.equal(result.sourceChecksumsVerified,true);assert.equal(result.databaseWrites,0);assert.equal(result.emailsSent,0);
  assert.throws(()=>execFileSync(process.execPath,[...args,'--apply'],{stdio:'pipe'}));await writeFile(projects,'Changed export');assert.throws(()=>execFileSync(process.execPath,args,{stdio:'pipe'}));
 }finally{for(const file of [manifest,members,projects])await unlink(file).catch(()=>{});await rmdir(dir);}
});
