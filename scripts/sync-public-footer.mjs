import {readFileSync,writeFileSync,copyFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const template=readFileSync(resolve(root,'shared/footer.html'),'utf8').trim();
writeFileSync(resolve(root,'apps/member/components/public-footer.snapshot.json'),JSON.stringify(template)+'\n');
copyFileSync(resolve(root,'shared/footer.css'),resolve(root,'apps/member/components/public-footer.css'));
copyFileSync(resolve(root,'shared/footer-behavior.mjs'),resolve(root,'apps/member/components/public-footer-behavior.mjs'));
// Every retained public HTML shell uses the same source, including pages not regenerated elsewhere.
for(const area of ['index.html','start','community-guidelines','our-story','terms','privacy','contact','projects','industry-news']){
 const visit=p=>{if(p.endsWith('.html')){const html=readFileSync(p,'utf8');const next=html.replace(/<footer class="footer(?: publicSiteFooter)?">[\s\S]*?<\/footer>/,template.replaceAll('{{ASSETS}}',relative(dirname(p),root).split(sep).join('/')+(dirname(p)===root?'':'/')));if(next!==html)writeFileSync(p,next);}else if(statSync(p).isDirectory())for(const entry of readdirSync(p,{withFileTypes:true})){if(entry.isDirectory()||entry.name.endsWith('.html'))visit(resolve(p,entry.name));}};
 visit(resolve(root,area));
}
console.log('Public footer synchronised across static pages and application runtime.');
