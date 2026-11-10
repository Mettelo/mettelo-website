import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkStagingEnvironment} from './staging-preflight.mjs';
const result=checkStagingEnvironment(process.env);if(!result.ok)throw Error(result.errors.join('; '));
const port=process.env.PORT||'3000';if(!/^\d+$/.test(port)||Number(port)<1||Number(port)>65535)throw Error('Invalid hosting port');
const cwd=fileURLToPath(new URL('../apps/member/.next/standalone/',import.meta.url));
const child=spawn(process.execPath,['server.js'],{cwd,stdio:'inherit',env:{...process.env,PORT:port,HOSTNAME:'0.0.0.0',NODE_ENV:'production'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('error',()=>{console.error('Staging runtime could not start.');process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});
