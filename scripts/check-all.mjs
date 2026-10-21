import {readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
for(const file of readdirSync(new URL('.',import.meta.url)).filter(file=>/^check(?:-[\w-]+)?\.mjs$/.test(file)&&file!=='check-all.mjs'))execFileSync(process.execPath,[fileURLToPath(new URL(file,import.meta.url))],{stdio:'inherit'});
