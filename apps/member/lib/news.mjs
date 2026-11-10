export const newsCategories=['Data','AI & Machine Learning','Technology','Careers','Mettelo'];
export const emptyArticle={title:'',excerpt:'',body:'',author:'Mettelo Editorial',category:'Data',format:'blog',cover_url:'',cover_alt:'',source_name:'',source_url:''};
export function articleSlug(value){return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');}
export function safeNewsUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/\s/.test(value);}catch{return false;}}
export function normaliseArticle(input,publishing=false){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Article fields are required.');
 const doc={};for(const key of Object.keys(emptyArticle)){if(typeof input[key]!=='string')throw Error('Article fields must be text.');doc[key]=input[key].trim();}
 for(const [key,max] of Object.entries({title:160,excerpt:360,body:50000,author:100,cover_alt:240,source_name:120,cover_url:1000,source_url:1000}))if(doc[key].length>max)throw Error(`${key.replaceAll('_',' ')} is too long.`);
 if(!doc.title)throw Error('Add an article title.');
 if(!newsCategories.includes(doc.category)||!['news','blog'].includes(doc.format))throw Error('Choose an article type and topic.');
 for(const key of ['cover_url','source_url'])if(doc[key]&&!safeNewsUrl(doc[key]))throw Error('Use HTTPS links without login details.');
 if(doc.cover_url&&!doc.cover_alt)throw Error('Describe the cover image for accessibility.');
 if(publishing&&(doc.title.length<5||doc.excerpt.length<20||doc.body.length<100||doc.author.length<2))throw Error('Before publishing, add a title, summary, author and at least 100 characters of article content.');
 return doc;
}
export function readingMinutes(body){return Math.max(1,Math.ceil(body.length/1200));}
export function articleUrl(slug){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>100)throw Error('Invalid article URL.');return `https://mettelo.com/industry-news/${slug}`;}
export function articleShares(slug,title){const url=articleUrl(slug);return [{label:'LinkedIn',href:`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`},{label:'X',href:`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`},{label:'Facebook',href:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`},{label:'WhatsApp',href:`https://wa.me/?text=${encodeURIComponent(title+' '+url)}`}];}
export function newsQuery(input={}){return {q:String(input.q||'').trim().slice(0,120),category:newsCategories.includes(input.category)?input.category:'',format:['news','blog'].includes(input.format)?input.format:'',page:String(Math.min(1000,Math.max(1,Number.parseInt(input.page,10)||1))) };}
