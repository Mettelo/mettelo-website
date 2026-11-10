import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
export function loadPipelineModule(name){
 const path=fileURLToPath(new URL(`../lib/opportunities/${name}.ts`,import.meta.url));
 const localRequire=createRequire(path);
 const module={exports:{}};
 const compiled=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const requireDependency=id=>id.startsWith('./')&&!id.endsWith('.mjs')?loadPipelineModule(id.slice(2)):localRequire(id);
 new Function('require','exports','module',compiled)(requireDependency,module.exports,module);
 return module.exports;
}
