import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const inventory=readFileSync(new URL('docs/V2-SCOPE-AND-PUBLIC-ROUTE-INVENTORY.md',root),'utf8');
const required=[...inventory.matchAll(/^\| (\/[^|]*?) \|/gm)].map(x=>x[1].trim());
const {entries}=JSON.parse(readFileSync(new URL('content/v2-route-coverage.json',root),'utf8'));
assert.equal(new Set(entries.map(x=>x.sourceRoute)).size,entries.length,'Duplicate coverage entry');
assert.deepEqual(entries.map(x=>x.sourceRoute).sort(),required.sort(),'Required route omitted or untracked');
for(const row of entries){
 assert(['implemented','mapped','missing'].includes(row.status),'Unknown disposition: '+row.sourceRoute);
 assert(['pending','accepted'].includes(row.acceptance),'Unknown acceptance: '+row.sourceRoute);
 if(row.status==='missing'){assert.equal(row.destination,null);assert.equal(row.evidenceFile,null);continue;}
 assert(row.destination.startsWith('/')&&!row.destination.startsWith('//'),'Unsafe route destination');
 assert(row.evidenceFile&&!row.evidenceFile.includes('..')&&existsSync(fileURLToPath(new URL(row.evidenceFile,root))),'Missing implementation evidence: '+row.sourceRoute);
 const fragment=row.destination.split('#')[1];if(fragment)assert(readFileSync(new URL(row.evidenceFile,root),'utf8').includes('id="'+fragment+'"'),'Missing destination anchor');
}
const counts=Object.fromEntries(['implemented','mapped','missing'].map(status=>[status,entries.filter(r=>r.status===status).length]));
console.log('Historical route reference: '+JSON.stringify(counts)+'. This inventory does not define the simplified release scope.');
if(process.argv.includes('--require-complete')){
 console.log('The blanket platform-parity gate is retired by owner direction. Review V2-SIMPLIFICATION-AND-GAP-PLAN-2026-11-04.md for essential journey acceptance; this command is not a release sign-off.');
}
