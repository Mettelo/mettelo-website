import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const image='https://mettelo.com/assets/community-collaboration-1200.webp';
function visit(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
 if(entry.isDirectory()&&(dir!==root||['start','community-guidelines','our-story','terms','privacy','contact','projects'].includes(entry.name)))visit(resolve(dir,entry.name));
 else if(entry.isFile()&&entry.name.endsWith('.html')){
 const path=resolve(dir,entry.name);let html=readFileSync(path,'utf8').replaceAll('\r\n','\n');if(!/<head[\s>]/i.test(html))continue;
 const title=html.match(/<title>(.*?)<\/title>/s)?.[1]||'Mettelo';
 const description=html.match(/<meta name="description" content="([^"]*)"/i)?.[1]||'Explore projects, learning and career resources with the Mettelo Data, AI and Technology community.';
 html=html.replace(/<meta (?:property|name)="(?:og:(?:title|description|image(?::(?:width|height|alt))?)|twitter:(?:card|title|description|image|image:alt))"[^>]*>/g,'');
 const alt='Professionals collaborating around laptops on a shared project';
 html=html.replace('</head>',`<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="800"><meta property="og:image:alt" content="${alt}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="${alt}"></head>`);
 writeFileSync(path,html);
 }
}}
visit(root);console.log('Public social preview metadata updated.');
