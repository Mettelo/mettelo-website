import {readFileSync,readdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','start/index.html','our-story/index.html','community-guidelines/index.html','terms/index.html','privacy/index.html','contact/index.html'];
for(const page of pages){const html=readFileSync(resolve(root,page),'utf8');assert(!html.includes('discord.gg/pretKbew'));if(page==='index.html'){assert(html.includes('shared/home.css'));assert(!html.includes('shared/design.css'));assert(html.includes('assets/logo-sand.svg'));}else{assert(html.includes('shared/design.css'));assert(html.includes('shared/interactions.js'));assert(html.includes('assets/logo-navy.svg'));}}
const home=readFileSync(resolve(root,'index.html'),'utf8');assert(home.includes('class="career-panel"'));const hero=home.match(/<section class="hero">([\s\S]*?)<\/section>/)[1];assert.equal((hero.match(/class="btn /g)||[]).length,3);for(const destination of ['https://tally.so/r/J9b5zd','#support','#waitlist'])assert(hero.includes(`href="${destination}"`));
const js=readFileSync(resolve(root,'shared/interactions.js'),'utf8');assert(js.includes('https://discord.gg/yy9qJZ7W'));assert(!/\bfetch\s*\(|localStorage|sessionStorage|sendBeacon|innerHTML/.test(js),'Enhancements must not transmit/store searches or insert untrusted HTML');
assert(readFileSync(resolve(root,'shared/design.css'),'utf8').includes('prefers-reduced-motion'));
assert(readFileSync(resolve(root,'waitlist/config.php'),'utf8').includes("'enabled' => false"));
console.log('Seven-page design assets, current Discord invite, progressive fallback and privacy invariants passed.');
