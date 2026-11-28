import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Render the real shared icon component in the existing Node-only JSX harness.
// Inline its trusted JSON snapshot because data: modules have no relative base.
let source=readFileSync(new URL('../../components/AppIcon.tsx',import.meta.url),'utf8');
source=source.replace(/import icons from '[^']+';/,'const icons='+readFileSync(new URL('../../components/ui-icons.snapshot.json',import.meta.url),'utf8')+';');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace('"react/jsx-runtime"',JSON.stringify(import.meta.resolve('react/jsx-runtime')));
export const uiIconModule='data:text/javascript;base64,'+Buffer.from(compiled).toString('base64');
export function resolveUiIcon(code){return code.replace(/from\s+['"](?:@\/components\/|\.\/)AppIcon['"]/g,'from '+JSON.stringify(uiIconModule));}
