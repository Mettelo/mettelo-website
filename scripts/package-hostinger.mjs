import {cpSync,mkdirSync} from 'node:fs';
import {resolve,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const target=process.argv[2];
if(!target||!isAbsolute(target))throw new Error('Provide a new absolute destination directory.');
// Explicit public-file list keeps repository metadata, tests and review notes out of hosting.
mkdirSync(target,{recursive:false});
for(const file of ['index.html','tokens.css','styles.css','career.css','script.js','robots.txt','sitemap.xml','assets','start','community-guidelines','our-story','terms','privacy','contact','waitlist'])cpSync(resolve(root,file),resolve(target,file),{recursive:true});
mkdirSync(resolve(target,'shared'));
cpSync(resolve(root,'shared/public.css'),resolve(target,'shared/public.css'));
cpSync(resolve(root,'shared/trust.css'),resolve(target,'shared/trust.css'));
cpSync(resolve(root,'shared/design.css'),resolve(target,'shared/design.css'));
cpSync(resolve(root,'shared/interactions.js'),resolve(target,'shared/interactions.js'));
cpSync(resolve(root,'shared/home.css'),resolve(target,'shared/home.css'));
console.log('Hostinger public files prepared. Waitlist remains disabled pending release checks.');

cpSync(resolve(root,'shared/home.js'),resolve(target,'shared/home.js'));
cpSync(resolve(root,'.htaccess'),resolve(target,'.htaccess'));
