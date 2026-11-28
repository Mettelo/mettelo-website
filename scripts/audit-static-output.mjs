import {readdirSync, statSync} from 'node:fs';
import {resolve, relative, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'dist');
const publicTypes=/\.(?:html|css|js|svg|webp|jpe?g|png|ico|txt|xml)$/i;
const forbiddenParts=new Set(['apps','node_modules','.git','.next','supabase','private-data','tests','docs','services']);
let count=0;
function inspect(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    const full=resolve(directory,entry.name);
    const path=relative(output,full).replaceAll('\\','/');
    if(entry.isSymbolicLink())throw new Error(`Symlink is not permitted in public output: ${path}`);
    if(forbiddenParts.has(entry.name)||entry.name.startsWith('.env'))throw new Error(`Private/source path in public output: ${path}`);
    if(entry.isDirectory()){inspect(full);continue;}
    if(!entry.isFile()||(!publicTypes.test(entry.name)&&path!=='.htaccess'))throw new Error(`Unexpected public file type: ${path}`);
    count++;
  }
}
if(!statSync(output).isDirectory())throw new Error('Build the static website before checking output.');
inspect(output);
if(!count)throw new Error('Static output must not be empty.');
console.log(`Static output boundary passed: ${count} public files; no application source, PHP, environment files or private-data paths.`);
