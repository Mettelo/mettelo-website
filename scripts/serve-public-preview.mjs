import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const runtimePort=process.env.METTELO_ISOLATED_PREVIEW==='1'?3004:3001;
const runtimeOrigin='http://127.0.0.1:'+runtimePort;
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.xml':'application/xml','.txt':'text/plain'};
const previewServer=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1:3002').pathname);
  if((pathname==='/sitemap.xml'||pathname==='/industry-news'||pathname.startsWith('/industry-news/')||pathname.startsWith('/_next/')||pathname==='/mettelo-logo.svg')&&['GET','HEAD'].includes(req.method)){
   try{const upstream=await fetch(runtimeOrigin+req.url,{headers:{cookie:req.headers.cookie||''},redirect:'manual',signal:AbortSignal.timeout(30000)});const headers={'Content-Type':upstream.headers.get('content-type')||'text/plain','Cache-Control':'private, no-store','Vary':'Cookie','X-Robots-Tag':'noindex, nofollow'};const refreshedCookies=upstream.headers.getSetCookie();if(refreshedCookies.length)res.setHeader('Set-Cookie',refreshedCookies);if(upstream.headers.has('location'))headers.Location=upstream.headers.get('location');res.writeHead(upstream.status,headers);res.end(req.method==='HEAD'?undefined:Buffer.from(await upstream.arrayBuffer()));}catch{res.writeHead(503,{'Content-Type':'text/plain'});res.end('The Industry News preview is temporarily unavailable.');}return;
  }
  if(pathname==='/api/workshop-recordings'&&req.method==='GET'){
   try{const upstream=await fetch(runtimeOrigin+req.url,{redirect:'error',signal:AbortSignal.timeout(18000)});res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/json','Cache-Control':upstream.headers.get('cache-control')||'no-store'});res.end(Buffer.from(await upstream.arrayBuffer()));}catch{res.writeHead(503,{'Content-Type':'application/json'});res.end('{"recordings":[]}');}return;
  }
  // Local-only same-origin bridge to the existing member runtime. Fixed destination.
  if(pathname==='/auth/signout'&&req.method==='POST'){
   if(req.headers.origin!=='http://127.0.0.1:3002'){res.writeHead(403,{'Content-Type':'text/plain'});res.end('Invalid request origin.');return;}
   const upstream=await fetch(runtimeOrigin+'/auth/signout',{method:'POST',headers:{origin:runtimeOrigin,cookie:req.headers.cookie||''},redirect:'manual',signal:AbortSignal.timeout(12000)});
   const cookies=upstream.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);const headers={'Cache-Control':'private, no-store','Vary':'Cookie','Content-Type':upstream.headers.get('content-type')||'text/plain'};if(upstream.headers.has('location'))headers.Location=upstream.headers.get('location');res.writeHead(upstream.status,headers);res.end(await upstream.text());return;
  }
  if(pathname==='/api/contact'&&req.method==='POST'){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>24000){res.writeHead(413);res.end('Request too large');return;}}
   const upstream=await fetch(runtimeOrigin+'/api/contact',{method:'POST',headers:{origin:'http://127.0.0.1:3002','content-type':'application/json'},body,redirect:'error',signal:AbortSignal.timeout(12000)});
   res.writeHead(upstream.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(await upstream.text());return;
  }
  if(['/api/navigation','/api/project-activity'].includes(pathname)&&req.method==='GET'){
   const upstream=await fetch(runtimeOrigin+pathname,{headers:{cookie:req.headers.cookie||'',accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});
   const refreshedCookies=upstream.headers.getSetCookie();if(refreshedCookies.length)res.setHeader('Set-Cookie',refreshedCookies);
   res.writeHead(upstream.status,{'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Cookie'});res.end(await upstream.text());return;
  }
  let file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep))throw new Error('outside output');
  if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  const type=types[extname(file)];if(!type)throw new Error('not public');
  let body=await readFile(file);
  // Preview-only links: generated production files retain an honest availability section.
  if(extname(file)==='.html')body=Buffer.from(body.toString().replace(/href="\/?#member-access" data-member-route="(\/signup|\/signin|\/opportunities|\/member\/resources|\/member\/projects\/MTL-(?:DA|DE|DS|AI|XF|BA)-\d{3}\/interest)"/g,(_,route)=>`href="${runtimeOrigin}${route}"`));
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});res.end(body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Page not found');}
});
// Preserve Next's development connection when editorial pages use the public origin.
previewServer.on('upgrade',(req,socket,head)=>{
 if(!req.url?.startsWith('/_next/webpack-hmr')){socket.destroy();return;}
 const upstream=http.request({hostname:'127.0.0.1',port:runtimePort,path:req.url,headers:{...req.headers,host:'127.0.0.1:'+runtimePort}});
 upstream.on('upgrade',(response,remote,remoteHead)=>{
  socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(response.headers).map(([key,value])=>key+': '+value).join('\r\n')+'\r\n\r\n');
  if(head.length)remote.write(head);if(remoteHead.length)socket.write(remoteHead);
  socket.on('error',()=>remote.destroy());remote.on('error',()=>socket.destroy());socket.pipe(remote).pipe(socket);
 });upstream.on('response',()=>socket.destroy());upstream.on('error',()=>socket.destroy());upstream.end();
});
previewServer.listen(3002,'127.0.0.1',()=>console.log('Public website preview: http://127.0.0.1:3002/'));
