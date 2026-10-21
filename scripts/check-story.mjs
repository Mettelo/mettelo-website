import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html','start/index.html','community-guidelines/index.html','our-story/index.html'];
const route = path => path === '/' ? 'index.html' : `${path.replace(/^\/|\/$/g,'')}/index.html`;
for(const page of pages) {
  const html=readFileSync(resolve(root,page),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length,new Set(ids).size,`Duplicate IDs ${page}`);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert(html.includes('href="/our-story/"'),`Missing story navigation ${page}`);
  for(const [,href] of html.matchAll(/href="([^"]+)"/g)) {
    if(href.startsWith('#')) assert(ids.includes(href.slice(1)),`Missing ${page}${href}`);
    else if(href.startsWith('/')) {
      const url=new URL(href,'https://example.test');const target=resolve(root,route(url.pathname));
      assert(existsSync(target),`Missing route ${href}`);
      if(url.hash) assert(readFileSync(target,'utf8').includes(`id="${url.hash.slice(1)}"`),`Missing cross-page anchor ${href}`);
    }
  }
  for(const [,asset] of html.matchAll(/(?:href|src)="([^"#:]+\.(?:css|js|svg))"/g)) assert(existsSync(resolve(dirname(resolve(root,page)),asset)));
  for(const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g)||[]) assert(tag.includes('noopener')&&tag.includes('noreferrer'));
}
const story=readFileSync(resolve(root,'our-story/index.html'),'utf8');
const schema=JSON.parse(story.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(schema['@type'],'AboutPage');assert.equal(schema.about.name,'Mettelo');
assert.equal(schema.about.founder.name,'O. Johnson Taiwo');
assert.equal(schema.about.founder.url,'https://johnsontaiwo.com/');
assert(!schema.datePublished&&!schema.image&&!schema.about.foundingDate&&!schema.about.founder.image);
assert(!story.includes('Founder photograph pending'));
assert(story.includes('alt="O. Johnson Taiwo, founder of Mettelo"'));
assert(story.includes('loading="lazy"'));
for(const file of ['founder-480.webp','founder-960.webp','founder-960.jpg']) assert(existsSync(resolve(root,'assets',file)));
assert(story.includes('over seven years of experience'));
assert(story.includes('I believe professional growth should go beyond qualifications and certifications.'));
assert(story.includes('class="founder-message"'));
assert(story.includes('https://tally.so/r/J9b5zd'));
console.log('Passed: all four pages/routes/assets/anchors, story navigation, safe tabs, supplied founder content, responsive portrait assets, alt text and lazy loading.');
