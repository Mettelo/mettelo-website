import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','start/index.html','community-guidelines/index.html','our-story/index.html','terms/index.html','privacy/index.html','contact/index.html'];
for(const page of pages){
 let html=readFileSync(resolve(root,page),'utf8');
 const css=page==='index.html'?'shared/public.css':'../shared/public.css';
 if(!html.includes(`href="${css}"`))html=html.replace('</head>',`<link rel="stylesheet" href="${css}">\n</head>`);
 const design=page==='index.html'?'shared/design.css':'../shared/design.css';
 if(!html.includes(`href="${design}"`))html=html.replace('</head>',`<link rel="stylesheet" href="${design}">\n</head>`);
 const interaction=page==='index.html'?'shared/interactions.js':'../shared/interactions.js';
 if(!html.includes(`src="${interaction}"`))html=html.replace('</body>',`<script src="${interaction}" defer></script>\n</body>`);
 if(page==='contact/index.html'&&!html.includes('data-copy-email'))html=html.replace('</section><div class="wrap guide-layout">','<div class="wrap"><div class="support-quick"><a href="#general">General enquiry</a><a href="#community">Report a concern</a><a href="#privacy">Privacy request</a><button type="button" class="copy-email" data-copy-email hidden>Copy email address</button></div><p class="copy-status" data-copy-status role="status" aria-live="polite"></p></div></section><div class="wrap guide-layout">');
 for(const part of ['header','footer']){
  let shared=readFileSync(resolve(root,`shared/${part}.html`),'utf8').trim().replaceAll('{{ASSETS}}',page==='index.html'?'':'../');
  if(part==='header'&&page==='our-story/index.html')shared=shared.replace('href="/our-story/"','href="/our-story/" aria-current="page"');
  html=html.replace(new RegExp(`<${part} class="${part==='header'?'nav':'footer'}">[\\s\\S]*?</${part}>`),shared);
 }
 writeFileSync(resolve(root,page),html);
}
console.log('Shared navigation and footer synchronised across seven static pages.');
