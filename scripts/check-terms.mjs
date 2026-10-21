import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','start/index.html','community-guidelines/index.html','our-story/index.html','terms/index.html','privacy/index.html','contact/index.html'];
for(const page of pages){
 const html=readFileSync(resolve(root,page),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert(html.includes('aria-label="Legal and trust"'));
 for(const [,href] of html.matchAll(/href="([^"]+)"/g)){
  if(href.startsWith('#'))assert(ids.includes(href.slice(1)),`${page}: ${href}`);
  if(href.startsWith('/')){const u=new URL(href,'https://example.test');const file=resolve(root,u.pathname==='/'?'index.html':u.pathname.replace(/^\/|\/$/g,'')+'/index.html');assert(existsSync(file),href);if(u.hash)assert(readFileSync(file,'utf8').includes(`id="${u.hash.slice(1)}"`),href);}
 }
 for(const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g)||[])assert(tag.includes('noopener')&&tag.includes('noreferrer'));
}
const terms=readFileSync(resolve(root,'terms/index.html'),'utf8');
assert(terms.includes('Mettelo Technologies Limited'));
assert(terms.includes('aged 18 or over'));
assert(terms.includes('does not guarantee employment, sponsorship, project placement or professional outcomes'));
assert(!terms.includes('<form'));
assert(terms.includes('mailto:hello@mettelo.com'));
assert(existsSync(resolve(root,'privacy/index.html'))&&existsSync(resolve(root,'contact/index.html')));
assert(terms.includes('https://tally.so/r/J9b5zd')&&terms.includes('https://tally.so/r/eq4Wjo'));
console.log('Terms scope, operator, adult eligibility, seven-page trust links, anchors and external-link safety passed.');
