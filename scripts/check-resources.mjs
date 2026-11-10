import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const five=['global-talent/technology','global-talent/arts-and-culture','global-talent/academia-and-research','innovator-founder/guide','nigerian-passport/passport-renewal-uk'];
const others=['README','global-talent/README','global-talent/technology-checklist','global-talent/arts-and-culture-checklist','global-talent/research-checklist','global-talent/tracker-guide','innovator-founder/README','innovator-founder/checklist','innovator-founder/tracker-guide','nigerian-passport/README'];
for(const name of [...five,...others]) {
  const path='resources/content/'+name+'.md';
  assert(existsSync(resolve(root,path)), 'Missing resource: '+path);
  assert(read(path).trim().length>300,'Unusually empty resource: '+path);
}
for(const name of five) {
  assert(read('resources/content/'+name+'.md').includes('mermaid'),'Missing diagram: '+name);
}
for(const file of ['resources/index.html','resources/guide/index.html','resources/assets/home.js','resources/assets/reader.js','resources/assets/library.css'])assert(existsSync(resolve(root,file)),'Missing reader asset: '+file);
const packageScript=read('scripts/package-hostinger.mjs');
assert(packageScript.includes("'resources'"),'Hostinger must package the resource library');
assert(packageScript.includes("IMPLEMENTATION.md"),'Internal implementation notes must be excluded');
const landing=read('resources/index.html');
for(const name of five)assert(landing.includes('doc='+name),'Missing main resource card '+name);
const reader=read('resources/assets/reader.js');
for(const name of [...five,...others])assert(reader.includes("'"+name+"'"),'Missing reader routing for '+name);
assert(reader.includes('DOMPurify.sanitize'),'Reader must sanitise rendered Markdown');
assert(reader.includes('mermaid.run'),'Reader must render process maps');
console.log('Immigration library structure checks passed: 15 resources, 5 main diagrams, routes, packaging and sanitisation.');
