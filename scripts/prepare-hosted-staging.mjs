import {readdir,readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {resolve,relative,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=resolve(root,'dist'),target=resolve(root,'apps/member/public/_site');
// Generated, private staging build tree only. Never modify the static release package.
if(!target.startsWith(resolve(root,'apps/member/public')+sep))throw Error('Unsafe staging asset target');
await readFile(resolve(source,'index.html'));
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
const routes=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
 const file=resolve(dir,entry.name),path=relative(source,file).split(sep).join('/');
 if(entry.isDirectory()){if(path==='industry-news')continue;await walk(file);continue;}
 if(entry.name.startsWith('.')||['robots.txt','sitemap.xml'].includes(path))continue;
 if(!/\.(html|css|js|svg|png|webp|jpg|jpeg|ico|woff2?)$/.test(path))throw Error('Unapproved public staging asset: '+path);
 const dest=resolve(target,path);await mkdir(dirname(dest),{recursive:true});
 if(path.endsWith('.html')){
  let html=await readFile(file,'utf8');
  html=html.replace(/href="[^"]*" data-member-route="(\/[^"<>]*)"/g,(_,route)=>`href="${route}" data-member-route="${route}"`);
  html=html.replace(/(href|src|action)="https:\/\/(?:www\.)?mettelo\.com(?=[/"#?])/g,'$1="https://staging.mettelo.com');
  html=html.replace(/<meta name="robots"[^>]*>/gi,'').replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
  await writeFile(dest,html);
 }else if(path==='shared/home.js'){
  let js=await readFile(file,'utf8');js=js.replace("if(window.location.origin==='http://127.0.0.1:3002')link.href='http://127.0.0.1:3001/signup';","link.href='/signup';");await writeFile(dest,js);
 }else await copyFile(file,dest);
 const url='/'+path;routes.push({source:url,destination:'/_site'+url});
 if(path.endsWith('/index.html'))routes.push({source:url.slice(0,-11),destination:'/_site'+url});
 if(path==='index.html')routes.push({source:'/',destination:'/_site/index.html'});
}}
await walk(source);
await writeFile(resolve(root,'apps/member/hosted-static-routes.json'),JSON.stringify(routes,null,2)+'\n');
console.log(JSON.stringify({prepared:true,staticRewrites:routes.length,publicOrigin:'https://staging.mettelo.com',secretsIncluded:false}));
