import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,cpSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function put(root,path,content='public fixture'){
  mkdirSync(dirname(join(root,path)),{recursive:true});
  writeFileSync(join(root,path),content);
}
function list(directory,base=directory){
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?list(join(directory,entry.name),base):[relative(base,join(directory,entry.name)).replaceAll('\\','/')]).sort();
}

test('public packaging preserves approved files while excluding member source and private inputs',()=>{
  const temporary=mkdtempSync(join(tmpdir(),'mettelo-package-'));
  try{
    const fixture=join(temporary,'source');
    const output=join(temporary,'published');
    for(const path of ['index.html','tokens.css','styles.css','career.css','script.js','robots.txt','sitemap.xml','.htaccess','assets/logo.svg','start/index.html','community-guidelines/index.html','our-story/index.html','terms/index.html','privacy/index.html','contact/index.html','waitlist/form.js','shared/public.css','shared/footer.css','shared/navigation.css','shared/v2-pages.css','shared/trust.css','shared/design.css','shared/interactions.js','shared/home.css','shared/home.js','shared/home-experience.css','shared/home-experience.js'])put(fixture,path,undefined);
    mkdirSync(join(fixture,'scripts'),{recursive:true});
    put(fixture,'projects/index.html');
    put(fixture,'industry-news/index.html');
    cpSync(join(root,'scripts/package-hostinger.mjs'),join(fixture,'scripts/package-hostinger.mjs'));
    for(const path of ['apps/member/app/page.tsx','apps/member/.env.local','supabase/migrations/private.sql','private-data/members.csv','.env.local','members.csv','package.json','node_modules/example/index.js','.git/config','tests/source.test.mjs'])put(fixture,path,'DO_NOT_PUBLISH');
    execFileSync(process.execPath,[join(fixture,'scripts/package-hostinger.mjs'),output],{stdio:'pipe'});
    const published=list(output);
    assert(published.includes('assets/logo.svg'));
    assert(published.includes('start/index.html'));
    assert(published.includes('shared/v2-pages.css'));
    assert(published.includes('industry-news/index.html'));
    assert(published.includes('.htaccess'));
    assert(!published.some(path=>path.startsWith('waitlist/')));
    assert(!readFileSync(join(output,'index.html'),'utf8').includes('src="waitlist/form.js"'));
    for(const path of published)assert(!readFileSync(join(output,path),'utf8').includes('DO_NOT_PUBLISH'),`Private sentinel leaked into ${path}`);
  }finally{rmSync(temporary,{recursive:true,force:true});}
});

test('static output inspection rejects leaked configuration and server files',()=>{
  const temporary=mkdtempSync(join(tmpdir(),'mettelo-output-'));
  try{
    mkdirSync(join(temporary,'scripts'));
    cpSync(join(root,'scripts/audit-static-output.mjs'),join(temporary,'scripts/audit-static-output.mjs'));
    put(temporary,'dist/index.html');
    const run=()=>spawnSync(process.execPath,[join(temporary,'scripts/audit-static-output.mjs')],{encoding:'utf8'});
    assert.equal(run().status,0);
    for(const path of ['.env.local','waitlist/handler.php','apps/member/page.tsx','private-data/members.csv','supabase/migration.sql']){
      rmSync(join(temporary,'dist'),{recursive:true});
      put(temporary,'dist/index.html');
      put(temporary,`dist/${path}`,'PRIVATE');
      const result=run();
      assert.notEqual(result.status,0,`${path} must fail inspection`);
    }
  }finally{rmSync(temporary,{recursive:true,force:true});}
});
