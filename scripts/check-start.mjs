import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'start/index.html'), 'utf8');
const source = readFileSync(resolve(root, 'start/checklist.js'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
assert.equal(new Set(ids).size, ids.length);
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(id), `Missing anchor: ${id}`);
for (const [, path] of html.matchAll(/(?:src|href)="([^"#:]+\.(?:svg|css|js))"/g)) assert(existsSync(resolve(root, 'start', path)), `Missing file: ${path}`);
assert.equal((html.match(/<h1\b/g) || []).length, 1);
const steps = [...html.matchAll(/data-step="([^"]+)"/g)].map(x => x[1]);
assert.equal(steps.length, 7);
assert.equal((html.match(/class="explore-card"/g) || []).length, 8);
for (const url of ['https://tally.so/r/J9b5zd','https://tally.so/r/eq4Wjo','https://mettelo.github.io/project-library/','https://github.com/Mettelo','https://www.youtube.com/@Officialmettelo','https://discord.gg/yy9qJZ7W','https://1drv.ms/f/c/da3aa7b1d9999396/IgDj9KMf7GDaSqBXqX6uwbNZATwEB_HxJ4g7Yg_2vC2dI_Q?e=HDZUPE','https://1drv.ms/x/c/da3aa7b1d9999396/IQCU0ZSkkkEVSLu58ZoZK-a1AYcq7zWpKRaK8VLILHjIRN0?e=kBfeT0']) assert(html.includes(`href="${url}"`));
for (const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []) assert(tag.includes('noopener') && tag.includes('noreferrer'));

function boot(saved = null, blocked = false) {
  let stored = saved;
  const boxes = steps.map(step => ({dataset:{step}, checked:false, callbacks:{}, addEventListener(e,fn){this.callbacks[e]=fn;}, closest(){return {classList:{toggle(){}}};}, focus(){this.focused=true;}}));
  const progress = {}, text = {}, status = {};
  const reset = {callbacks:{},addEventListener(e,fn){this.callbacks[e]=fn;}};
  const document = {querySelectorAll:()=>boxes,querySelector:()=>reset,getElementById:id=>({'onboarding-progress':progress,'progress-text':text,'storage-status':status}[id])};
  vm.runInNewContext(source,{document,localStorage:{getItem(){if(blocked)throw Error('blocked');return stored;},setItem(k,v){if(blocked)throw Error('blocked');stored=v;},removeItem(){if(blocked)throw Error('blocked');stored=null;}}});
  return {boxes,progress,text,status,reset,stored:()=>stored};
}
const app = boot();
assert.equal(app.progress.value, 0);
assert.equal(app.stored(),null,'No storage created before checklist interaction');
app.boxes[0].checked=true;app.boxes[0].callbacks.change();
assert.equal(app.progress.value, 1);
assert.deepEqual(JSON.parse(app.stored()), [steps[0]]);
assert.equal(boot(app.stored()).boxes[0].checked, true, 'Progress survives reload');
app.boxes[0].checked=false;app.boxes[0].callbacks.change();assert.equal(app.progress.value, 0);
for(const box of app.boxes){box.checked=true;box.callbacks.change();}
assert.equal(app.progress.value,7);assert(app.text.textContent.includes('7 of 7'));
app.reset.callbacks.click();assert.equal(app.progress.value,0);assert(app.boxes[0].focused);
assert.equal(app.stored(),null,'Reset removes saved progress');
for(const invalid of ['{broken', '{}', '[null,42,"unknown"]']) assert.equal(boot(invalid).progress.value,0);
const unavailable=boot(null,true);unavailable.boxes[1].checked=true;unavailable.boxes[1].callbacks.change();assert.equal(unavailable.progress.value,1);assert(unavailable.status.textContent.includes('unavailable'));
console.log('Passed: onboarding anchors/assets, seven labelled steps, eight cards, eight essential destinations, safe tabs; persistence, unchecking, completion, reset, malformed and blocked storage.');
