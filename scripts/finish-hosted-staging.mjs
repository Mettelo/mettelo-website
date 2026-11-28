import {readdir,cp,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const app=fileURLToPath(new URL('../apps/member/',import.meta.url));
const dest=resolve(app,'.next/standalone');
async function inspect(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(e.name.startsWith('.env'))throw Error('Private environment file found in build output; packaging refused.');if(e.isDirectory())await inspect(resolve(dir,e.name));}}
await inspect(dest);await cp(resolve(app,'public'),resolve(dest,'public'),{recursive:true});await mkdir(resolve(dest,'.next'),{recursive:true});await cp(resolve(app,'.next/static'),resolve(dest,'.next/static'),{recursive:true});
console.log('Standalone staging assets prepared; no private environment files included.');
