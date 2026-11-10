import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
for(const page of ['index.html','start/index.html','community-guidelines/index.html','our-story/index.html','terms/index.html','privacy/index.html','contact/index.html']){
 const html=readFileSync(resolve(root,page),'utf8');
 assert(!html.includes('href="/start/'),'Onboarding must be unlisted: '+page);
 for(const part of ['header','footer']){
  let expected=readFileSync(resolve(root,part==='header'&&page==='index.html'?'content/home-header.html':`shared/${part}.html`),'utf8').trim().replaceAll('{{ASSETS}}',page==='index.html'?'':'../');
  if(part==='header'&&page==='our-story/index.html')expected=expected.replace('href="/our-story/"','href="/our-story/" aria-current="page"');
  assert(html.includes(expected),'Shared '+part+' drift: '+page);
 }
}
assert(readFileSync(resolve(root,'start/index.html'),'utf8').includes('noindex,follow'));
const home=readFileSync(resolve(root,'index.html'),'utf8');
assert(!home.includes('id="waitlist-form"'));
assert(!home.includes('href="#waitlist"'));
assert(home.includes('id="account-next"'));
assert(home.includes('data-member-route="/signup"'));
console.log('Shared navigation, unlisted guide and single account-entry journey passed.');
