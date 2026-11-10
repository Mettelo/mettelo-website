import {readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'dist');
execFileSync(process.execPath,[resolve(root,'scripts/sync-design-tokens.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[resolve(root,'scripts/build-job-taxonomy.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[resolve(root,'scripts/build-homepage.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[resolve(root,'scripts/build-project-catalogue.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[resolve(root,'scripts/build-contact-form.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[resolve(root,'scripts/build-news-fallback.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[resolve(root,'scripts/build-social-metadata.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[resolve(root,'scripts/check-all.mjs')],{stdio:'inherit'});
if(existsSync(output))rmSync(output,{recursive:true});
execFileSync(process.execPath,[resolve(root,'scripts/package-hostinger.mjs'),output],{stdio:'inherit'});
// The public allowlist excludes member runtime, private inputs and retired waitlist handlers.
console.log('Static website ready in dist; account access remains release-gated.');
