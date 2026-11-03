import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.xml':'application/xml','.txt':'text/plain'};
http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1:3002').pathname);
  // Local-only same-origin bridge to the existing member runtime. Fixed destination.
  if(['/api/navigation','/api/project-activity'].includes(pathname)&&req.method==='GET'){
   const upstream=await fetch('http://127.0.0.1:3001'+pathname,{headers:{cookie:req.headers.cookie||'',accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});
   const refreshedCookies=upstream.headers.getSetCookie();if(refreshedCookies.length)res.setHeader('Set-Cookie',refreshedCookies);
   res.writeHead(upstream.status,{'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Cookie'});res.end(await upstream.text());return;
  }
  let file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep))throw new Error('outside output');
  if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  const type=types[extname(file)];if(!type)throw new Error('not public');
  let body=await readFile(file);
  // Preview-only links: generated production files retain an honest availability section.
  if(extname(file)==='.html')body=Buffer.from(body.toString().replace(/href="\/?#member-access" data-member-route="(\/signup|\/signin|\/opportunities|\/member\/projects\/MTL-(?:DA|DE|DS|AI|XF|BA)-\d{3}\/interest)"/g,(_,route)=>`href="http://127.0.0.1:3001${route}"`));
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Page not found');}
}).listen(3002,'127.0.0.1',()=>console.log('Public website preview: http://127.0.0.1:3002/projects/'));
