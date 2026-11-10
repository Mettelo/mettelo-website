import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// A second Next development server must not share generated chunks with the auth preview.
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/next/dist/bin/next',import.meta.url)),'dev','--hostname','127.0.0.1','--port','3004'],{
 cwd:fileURLToPath(new URL('..',import.meta.url)),stdio:'inherit',env:{...process.env,METTELO_ISOLATED_PREVIEW:'1'}
});
child.on('error',error=>{console.error('Unable to start the isolated member preview:',error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
