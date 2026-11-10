import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import ts from 'typescript';
const require=createRequire(import.meta.url);
test('article formatting renders headings and links while escaping HTML and unsafe links',async()=>{
 const source=await readFile(new URL('../components/news/ArticleBody.tsx',import.meta.url),'utf8');
 let output=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText;
 for(const name of ['react/jsx-runtime','react'])output=output.replaceAll(`from "${name}"`,`from "${pathToFileURL(require.resolve(name)).href}"`).replaceAll(`from '${name}'`,`from '${pathToFileURL(require.resolve(name)).href}'`);
 output=output.replaceAll('@/lib/news.mjs',new URL('../lib/news.mjs',import.meta.url).href);
 const {default:Body}=await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
 const html=renderToStaticMarkup(createElement(Body,{body:'## A heading\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))\n\n[Source](https://example.com/report)\n\n- First point\n- Second point'}));
 assert.ok(html.includes('<h2>A heading</h2>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('href="javascript:'));assert.ok(html.includes('rel="noopener noreferrer"'));assert.ok(html.includes('<li>First point</li>'));
});
