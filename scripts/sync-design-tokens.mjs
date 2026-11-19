import './sync-public-footer.mjs';
import './sync-public-navigation.mjs';
import {copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
copyFileSync(fileURLToPath(new URL('tokens.css',root)),fileURLToPath(new URL('apps/member/app/design-tokens.css',root)));
copyFileSync(fileURLToPath(new URL('shared/ui-foundations.css',root)),fileURLToPath(new URL('apps/member/app/ui-foundations.css',root)));
copyFileSync(fileURLToPath(new URL('shared/lucide-license.txt',root)),fileURLToPath(new URL('apps/member/public/lucide-license.txt',root)));
console.log('Public and member design foundations synchronised.');
