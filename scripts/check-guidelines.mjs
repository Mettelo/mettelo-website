import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html','start/index.html','community-guidelines/index.html'];
const route = path => path === '/' ? 'index.html' : `${path.replace(/^\/|\/$/g,'')}/index.html`;
for (const path of pages) {
  const html = readFileSync(resolve(root,path),'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size, ids.length, `Duplicate IDs: ${path}`);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  for(const [,href] of html.matchAll(/href="([^"]+)"/g)) {
    if(href.startsWith('#')) assert(ids.includes(href.slice(1)),`Missing anchor ${path} ${href}`);
    else if(href.startsWith('/')) {
      const url = new URL(href,'https://example.test');
      const target = resolve(root,route(url.pathname));
      assert(existsSync(target),`Missing route: ${href}`);
      if(url.hash) assert(readFileSync(target,'utf8').includes(`id="${url.hash.slice(1)}"`),`Missing cross-page anchor: ${href}`);
    }
  }
  for(const [,asset] of html.matchAll(/(?:href|src)="([^"#:]+\.(?:css|js|svg))"/g)) assert(existsSync(resolve(dirname(resolve(root,path)),asset)),`Missing asset ${asset}`);
  for(const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g)||[]) assert(tag.includes('noopener')&&tag.includes('noreferrer'));
}
const guide=readFileSync(resolve(root,'community-guidelines/index.html'),'utf8');
assert.equal((guide.match(/class="standard-number"/g)||[]).length,10);
assert(!/<(?:input|form)\b/.test(guide),'Guidelines must not accept membership agreements');
assert(guide.includes('mailto:hello@mettelo.com'),'Business reporting route');
for(const text of ['Mettelo Technologies Limited','adults aged 18 or over','How concerns are considered','/privacy/','/contact/#community','Participation does not automatically constitute paid employment.','I agree to follow the Community Guidelines.','https://tally.so/r/J9b5zd','https://tally.so/r/eq4Wjo']) assert(guide.includes(text),`Missing: ${text}`);
console.log('Passed: local routes/assets/anchors, safe tabs, ten standards, adult eligibility, reporting/privacy links and no acceptance form.');
