import {readFileSync,writeFileSync} from 'node:fs';
const source=new URL('../content/opportunity-taxonomy.json',import.meta.url);const taxonomy=JSON.parse(readFileSync(source,'utf8'));
if(taxonomy.categories.length!==21||new Set(taxonomy.categories.map(c=>c.id)).size!==21)throw Error('Expected 21 unique job categories.');
const ids=new Set(taxonomy.categories.map(c=>c.id)),occupations=new Set();
for(const o of taxonomy.occupations){if(!o.id||occupations.has(o.id)||!o.canonicalTitle||!o.aliases.length||!o.categoryIds.length||o.categoryIds.some(id=>!ids.has(id))||!['direct','context'].includes(o.titlePolicy))throw Error('Invalid job occupation.');occupations.add(o.id);}
writeFileSync(new URL('../apps/member/lib/opportunities/job-taxonomy.snapshot.json',import.meta.url),JSON.stringify(taxonomy,null,2)+'\n');
console.log('Prepared '+taxonomy.categories.length+' categories and '+occupations.size+' occupational records.');

writeFileSync(new URL('../apps/member/lib/opportunities/job-taxonomy-labels.mjs',import.meta.url),'// Generated from content/opportunity-taxonomy.json.\nexport const TAXONOMY_VERSION='+JSON.stringify(taxonomy.version)+';\nexport const jobCategories='+JSON.stringify(taxonomy.categories.map(({id,label})=>({id,label})))+';\n');
