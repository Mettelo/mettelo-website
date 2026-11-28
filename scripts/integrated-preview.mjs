import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Local staging only. One canonical member origin also serves email callbacks.
const root=fileURLToPath(new URL('../',import.meta.url));
if(!existsSync(new URL('../dist/index.html',import.meta.url))){
 console.error('Run npm run build before starting the integrated preview.');process.exit(1);
}
const children=[];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
function start(args,cwd){
 const child=spawn(process.execPath,args,{cwd,stdio:'inherit',env:{...process.env,METTELO_ISOLATED_PREVIEW:'0',METTELO_BUILD_CHECK:'0'}});
 children.push(child);
 child.on('error',error=>{console.error(error.message);stop(1);});
 child.on('exit',code=>stop(code??1));
}
start(['node_modules/next/dist/bin/next','dev','--turbopack','--hostname','127.0.0.1','--port','3001'],root+'apps/member');
start(['scripts/serve-public-preview.mjs'],root);
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
console.log('Integrated staging preview: public http://127.0.0.1:3002/ · accounts, Lab, News and admin http://127.0.0.1:3001/');
