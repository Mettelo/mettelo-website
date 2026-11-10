import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
execFileSync(process.execPath,['--test',fileURLToPath(new URL('../tests/project-catalogue.test.mjs',import.meta.url))],{stdio:'inherit'});
