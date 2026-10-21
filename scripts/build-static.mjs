import {readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'dist');
execFileSync(process.execPath,[resolve(root,'scripts/check-all.mjs')],{stdio:'inherit'});
if(existsSync(output))rmSync(output,{recursive:true});
execFileSync(process.execPath,[resolve(root,'scripts/package-hostinger.mjs'),output],{stdio:'inherit'});
// Static hosts must never receive executable PHP source or mail configuration.
for(const file of ['config.php','handler.php','index.php'])rmSync(resolve(output,'waitlist',file));
// The static form uses the separately hosted, authenticated PHP endpoint.
console.log('Static website ready in dist; PHP excluded and waitlist uses forms.mettelo.com.');
