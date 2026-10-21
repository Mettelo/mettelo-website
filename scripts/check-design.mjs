import {readFileSync,readdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','start/index.html','our-story/index.html','community-guidelines/index.html','terms/index.html','privacy/index.html','contact/index.html'];
for(const page of pages){const html=readFileSync(resolve(root,page),'utf8');assert(html.includes('shared/design.css'));assert(html.includes('shared/interactions.js'));assert(!html.includes('discord.gg/pretKbew'));assert(html.includes('assets/logo-navy.svg'));}
const home=readFileSync(resolve(root,'index.html'),'utf8');assert(home.includes('data-career-finder'));assert.equal((home.match(/name="career-goal"/g)||[]).length,4);assert(home.includes('class="finder-fallback"'));assert(home.includes('<fieldset hidden>'),'JS chooser must not pretend to work without JS');
const js=readFileSync(resolve(root,'shared/interactions.js'),'utf8');assert(js.includes('https://discord.gg/yy9qJZ7W'));assert(!/\bfetch\s*\(|localStorage|sessionStorage|sendBeacon|innerHTML/.test(js),'Enhancements must not transmit/store searches or insert untrusted HTML');
assert(readFileSync(resolve(root,'shared/design.css'),'utf8').includes('prefers-reduced-motion'));
assert(readFileSync(resolve(root,'waitlist/config.php'),'utf8').includes("'enabled' => false"));
console.log('Seven-page design assets, current Discord invite, progressive fallback and privacy invariants passed.');
