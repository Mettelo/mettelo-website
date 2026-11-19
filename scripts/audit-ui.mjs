import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const walk=dir=>readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const areas=['apps/member/app','apps/member/components','shared','content','scripts'];
const publicFiles=['index.html',...['start','our-story','contact','community-guidelines','privacy','terms','projects','industry-news'].flatMap(walk)];
const files=[...new Set([...areas.flatMap(walk),...publicFiles,'styles.css','career.css','tokens.css'])].filter(f=>/\.(tsx|css|html|mjs|js)$/.test(f)&&f!=='scripts/audit-ui.mjs');
const findings=[];
for(const file of files){
 const source=readFileSync(resolve(root,file),'utf8');
 for(const match of source.matchAll(/[→←↗➜➔➤❯›»✦✧★◆●＋×✓✔⚠⌂◇☑◌▦▤◎▣⌑✉▶↘↓↑⋯⊕⚙✕▸]/gu)){
  const start=match.index;
  findings.push({file,line:source.slice(0,start).split('\n').length,symbol:match[0],context:source.slice(Math.max(0,start-70),start+85).replace(/\s+/g,' ')});
 }
}
const routes=walk('apps/member/app').filter(f=>/\/page\.tsx$/.test(f)).map(file=>({route:'/'+file.replace('apps/member/app/','').replace(/\/?page\.tsx$/,''),file}));
const publicPages=publicFiles.filter(f=>f.endsWith('.html')&&/<html[ >]/i.test(readFileSync(resolve(root,f),'utf8')));
const report={generatedAt:new Date().toISOString(),coverage:'Source inventory only. Visual coverage is recorded separately.',routes,publicPages,htmlFragments:files.filter(f=>f.endsWith('.html')&&!publicPages.includes(f)),components:files.filter(f=>f.startsWith('apps/member/components/')&&f.endsWith('.tsx')),localComponents:files.filter(f=>f.startsWith('apps/member/app/')&&f.endsWith('.tsx')&&!/\/(?:page|layout)\.tsx$/.test(f)),layouts:files.filter(f=>/\/layout\.tsx$/.test(f)),styles:files.filter(f=>f.endsWith('.css')),findings};
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
if(output)writeFileSync(resolve(output),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({routes:routes.length,publicPages:publicPages.length,sharedComponents:report.components.length,localComponents:report.localComponents.length,styles:report.styles.length,symbolOccurrences:findings.length,affectedFiles:new Set(findings.map(f=>f.file)).size,output:output?relative(root,resolve(output)):null}));
