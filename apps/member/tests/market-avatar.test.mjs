import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const hooksUrl=uri(`let cells=[],cursor=0,effects=[];export function useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],v=>cells[i]=v]}export function useRef(initial){const i=cursor++;return cells[i]??=( {current:initial})}export function useEffect(effect,deps){const i=cursor++;if(!cells[i]||deps.some((v,k)=>v!==cells[i][k])){cells[i]=deps;effects.push(effect)}}export function begin(){cursor=0}export function flush(){const pending=effects;effects=[];pending.forEach(f=>f())}export function reset(){cells=[];cursor=0;effects=[]}`);
const hooks=await import(hooksUrl);
const source=await fs.readFile(new URL('../components/MarketAvatar.tsx',import.meta.url),'utf8');
let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText.replace(/import\s+['"][^'"]+\.css['"];?/g,'');
code=code.replace(/from ['"]react['"]/g,'from '+JSON.stringify(hooksUrl)).replace(/from ['"]react\/jsx-runtime['"]/g,'from '+JSON.stringify(import.meta.resolve('react/jsx-runtime')));
const {default:Avatar}=await import(uri(code));
const memberId='11111111-1111-4111-8111-111111111111';
function render(id=memberId){hooks.begin();return Avatar({memberId:id,name:'Sample Member'});}
const image=tree=>tree.props.children[1];
test('failed image before hydration leaves initials and never becomes visible',()=>{
 hooks.reset();const tree=render(),img=image(tree);assert.equal(img.props['data-ready'],false);
 img.props.ref.current={complete:true,naturalWidth:0};hooks.flush();
 assert.equal(image(render()),false);assert.equal(render().props.children[0].props.children,'SM');
});
test('cached successful image appears after hydration; a different member starts with initials',()=>{
 hooks.reset();const img=image(render());img.props.ref.current={complete:true,naturalWidth:40};hooks.flush();
 assert.equal(image(render()).props['data-ready'],true);
 assert.equal(image(render('22222222-2222-4222-8222-222222222222')).props['data-ready'],false);
});
test('normal load and error handlers preserve the initials fallback',()=>{
 hooks.reset();const img=image(render());img.props.onLoad();assert.equal(image(render()).props['data-ready'],true);
 image(render()).props.onError();assert.equal(image(render()),false);
});
