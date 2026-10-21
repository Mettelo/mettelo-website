import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate IDs');
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(id), `Missing destination: ${id}`);
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Use one H1');
assert(html.includes('Where contribution becomes opportunity.'));
for (const [, path] of html.matchAll(/(?:src|href)="([^"#:]+\.(?:svg|css|js))"/g)) {
  assert(existsSync(resolve(root, path)), `Missing asset: ${path}`);
}
for (const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []) {
  assert(tag.includes('noopener') && tag.includes('noreferrer'), 'Unsafe external tab');
}
const required = ['https://tally.so/r/J9b5zd', 'https://tally.so/r/eq4Wjo', 'https://mettelo.github.io/project-library/', 'https://github.com/Mettelo', 'https://www.youtube.com/@Officialmettelo', 'https://discord.gg/pretKbew', 'https://1drv.ms/f/c/da3aa7b1d9999396/IgDj9KMf7GDaSqBXqX6uwbNZATwEB_HxJ4g7Yg_2vC2dI_Q?e=HDZUPE', 'https://1drv.ms/x/c/da3aa7b1d9999396/IQCU0ZSkkkEVSLu58ZoZK-a1AYcq7zWpKRaK8VLILHjIRN0?e=kBfeT0', 'https://x.com/officialmettelo', 'https://linkedin.com/company/officialmettelohq', 'https://facebook.com/officialmettelo', 'https://instagram.com/officialmettelo'];
for (const url of required) assert(html.includes(`href="${url}"`), `Missing integration: ${url}`);
assert(!readFileSync(resolve(root, 'assets/logo-sand.svg'), 'utf8').includes('M704.36 702'), 'Embedded tagline returned');
const files = ['index.html', 'tokens.css', 'styles.css', 'career.css', 'script.js', 'assets/logo-sand.svg', 'assets/favicon.svg'];
const bytes = files.reduce((total, file) => total + statSync(resolve(root, file)).size, 0);
assert(bytes < 100_000, 'Homepage asset budget exceeds 100KB');
console.log(`Passed: unique IDs, section destinations, assets, H1, tagline, safe external tabs, all 12 integrations. Initial local assets: ${bytes} bytes.`);
