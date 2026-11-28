import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),file=new URL('contact/index.html',root);let html=readFileSync(file,'utf8');
html=html.replace(/<!-- contact-form:start -->[\s\S]*?<!-- contact-form:end -->/,'');
const form=readFileSync(new URL('contact/form.html',root),'utf8');
html=html.replace('<div class="wrap guide-layout">',`<!-- contact-form:start --><div class="wrap">${form}</div><!-- contact-form:end --><div class="wrap guide-layout">`);
html=html.replace('href="/contact/contact.css"','href="./contact.css"').replace('src="/contact/contact.js"','src="./contact.js"');
if(!html.includes('href="./contact.css"'))html=html.replace('</head>','<link rel="stylesheet" href="./contact.css"></head>');
if(!html.includes('src="./contact.js"'))html=html.replace('</body>','<script src="./contact.js" defer></script></body>');
writeFileSync(file,html);
