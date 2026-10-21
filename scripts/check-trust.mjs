import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','start/index.html','our-story/index.html','community-guidelines/index.html','terms/index.html','privacy/index.html','contact/index.html'];
for(const page of pages){
 const html=readFileSync(resolve(root,page),'utf8');
 const text=html.replace(/<[^>]*>/g,' ');
 assert(!/\bV1\b/i.test(text),'Public version label '+page);
 assert(!/Draft for|Not yet effective|awaiting administrator|Privacy Notice required|pending review|awaiting approval/.test(text),'Unfinished public policy '+page);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);
 for(const [,asset] of html.matchAll(/(?:href|src)="([^"#:]+\.(?:css|js|svg))"/g))assert(existsSync(resolve(dirname(resolve(root,page)),asset)),asset);
}
const privacy=readFileSync(resolve(root,'privacy/index.html'),'utf8');
for(const phrase of ['Mettelo Technologies Limited','hello@mettelo.com','Tally','OneDrive','Hostinger','GitHub','WhatsApp','Discord','12 months','24 months','30 days','Legitimate interests','Consent','International handling','Do Not Track','Global Privacy Control','Nigeria Data Protection Commission','UK Information Commissioner'])assert(privacy.includes(phrase),phrase);
const contact=readFileSync(resolve(root,'contact/index.html'),'utf8');
for(const id of ['general','community','privacy','projects'])assert(contact.includes(`id="${id}"`));
assert(!contact.includes('<form'));
assert(!/registered in|registration number|company number/i.test(privacy));
assert(readFileSync(resolve(root,'waitlist/config.php'),'utf8').includes("'enabled' => false"));
const sitemap=readFileSync(resolve(root,'sitemap.xml'),'utf8');assert(!sitemap.includes('/start/'));
assert(sitemap.includes('https://mettelo.com/privacy/'));
console.log('Seven-page policy completeness, public labels, assets, privacy topics and support routes passed.');
