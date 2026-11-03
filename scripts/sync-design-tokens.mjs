import {copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
copyFileSync(fileURLToPath(new URL('tokens.css',root)),fileURLToPath(new URL('apps/member/app/design-tokens.css',root)));
console.log('Public and member design foundations synchronised.');
