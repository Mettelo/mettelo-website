import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
for(const page of ['index.html','start/index.html','community-guidelines/index.html','our-story/index.html','terms/index.html']){
 const html=readFileSync(resolve(root,page),'utf8');
 assert(!html.includes('href="/start/'),'Onboarding must be unlisted: '+page);
 for(const part of ['header','footer']){
  let expected=readFileSync(resolve(root,`shared/${part}.html`),'utf8').trim().replaceAll('{{ASSETS}}',page==='index.html'?'':'../');
  if(part==='header'&&page==='our-story/index.html')expected=expected.replace('href="/our-story/"','href="/our-story/" aria-current="page"');
  assert(html.includes(expected),'Shared '+part+' drift: '+page);
 }
}
assert(readFileSync(resolve(root,'start/index.html'),'utf8').includes('noindex,follow'));
const config=readFileSync(resolve(root,'waitlist/config.php'),'utf8');
assert(config.includes("'enabled' => false"));
assert(config.includes("'recipient' => 'hello@mettelo.com'"));
const home=readFileSync(resolve(root,'index.html'),'utf8');
assert(home.includes('<fieldset disabled>'));
for(const id of ['waitlist-name','waitlist-email'])assert(home.includes(`for="${id}"`));
assert(home.includes('name="consent" type="checkbox" value="yes" required'));
assert(!readFileSync(resolve(root,'waitlist/form.js'),'utf8').includes('localStorage'));
console.log('Shared page consistency, unlisted onboarding and waitlist release gate passed.');
