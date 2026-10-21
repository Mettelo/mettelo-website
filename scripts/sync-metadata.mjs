import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://mettelo.com';
const routes=['','our-story/','community-guidelines/','terms/','privacy/','contact/'];
for(const route of routes){const file=resolve(root,route,'index.html');let html=readFileSync(file,'utf8');html=html.replace(/<link rel="canonical"[^>]*>\s*/g,'').replace(/<meta property="og:url"[^>]*>\s*/g,'');html=html.replace('</head>',`<link rel="canonical" href="${origin}/${route}"><meta property="og:url" content="${origin}/${route}">\n</head>`);writeFileSync(file,html);}
writeFileSync(resolve(root,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+routes.map(route=>`<url><loc>${origin}/${route}</loc></url>`).join('\n')+'\n</urlset>\n');
writeFileSync(resolve(root,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
console.log('Public metadata and sitemap synchronised; onboarding remains unlisted/noindex.');
