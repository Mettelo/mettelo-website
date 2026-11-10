(() => {
'use strict';
const DATA = {
 'global-talent/technology':{title:'Digital Technology',category:'Global Talent',intro:'A complete, evidence-led guide to digital technology endorsement, preparation and application.',related:[['Technology checklist','global-talent/technology-checklist'],['Global Talent overview','global-talent/README'],['Tracker guidance','global-talent/tracker-guide']]},
 'global-talent/arts-and-culture':{title:'Arts & Culture',category:'Global Talent',intro:'Understand discipline-specific endorsement routes, professional recognition and preparation.',related:[['Arts checklist','global-talent/arts-and-culture-checklist'],['Global Talent overview','global-talent/README']]},
 'global-talent/academia-and-research':{title:'Academia & Research',category:'Global Talent',intro:'Compare research appointments, fellowships, funding and peer-review endorsement routes.',related:[['Research checklist','global-talent/research-checklist'],['Global Talent overview','global-talent/README']]},
 'innovator-founder/guide':{title:'Innovator Founder Visa',category:'Founders',intro:'From problem discovery and customer validation to an evidence-based business and endorsement case.',related:[['Founder checklist','innovator-founder/checklist'],['Founder tracker guide','innovator-founder/tracker-guide'],['Founder resources','innovator-founder/README']]},
 'nigerian-passport/passport-renewal-uk':{title:'Nigerian Passport Renewal',category:'Passport Services',intro:'A practical process for renewing a Nigerian passport from the UK.',related:[['Passport resources','nigerian-passport/README']]},
 'global-talent/technology-checklist':{title:'Digital Technology Checklist',category:'Supporting resource',intro:'An evidence and application readiness checklist.',related:[['Main guide','global-talent/technology']]},
 'global-talent/arts-and-culture-checklist':{title:'Arts & Culture Checklist',category:'Supporting resource',intro:'Review the correct evidence and route requirements.',related:[['Main guide','global-talent/arts-and-culture']]},
 'global-talent/research-checklist':{title:'Academia & Research Checklist',category:'Supporting resource',intro:'Route-specific evidence and readiness.',related:[['Main guide','global-talent/academia-and-research']]},
 'global-talent/tracker-guide':{title:'Global Talent Tracker Guide',category:'Supporting resource',intro:'Plan, record and verify your preparation.',related:[['Global Talent overview','global-talent/README']]},
 'innovator-founder/checklist':{title:'Innovator Founder Checklist',category:'Supporting resource',intro:'Review business and immigration readiness.',related:[['Main guide','innovator-founder/guide']]},
 'innovator-founder/tracker-guide':{title:'Innovator Founder Tracker Guide',category:'Supporting resource',intro:'Follow and record your business development activities.',related:[['Main guide','innovator-founder/guide']]},
 'global-talent/README':{title:'Global Talent Resources',category:'Resource directory',intro:'Choose the relevant Global Talent pathway.',related:[]},
 'innovator-founder/README':{title:'Innovator Founder Resources',category:'Resource directory',intro:'Guides, checklists and preparation materials.',related:[]},
 'nigerian-passport/README':{title:'Nigerian Passport Resources',category:'Resource directory',intro:'Renewal guidance for UK-based applicants.',related:[]},
 'README':{title:'Immigration Resource Directory',category:'Resource directory',intro:'The full immigration resource collection.',related:[]}
};
const params=new URLSearchParams(location.search);
const requested=params.get('doc')||'global-talent/technology';
const doc=Object.hasOwn(DATA,requested)?requested:'global-talent/technology';
const meta=DATA[doc];
const $=id=>document.getElementById(id);
document.title=meta.title+' | Mettelo Resource Library';
$('reader-title').textContent=meta.title;
$('reader-category').textContent=meta.category;
$('reader-intro').textContent=meta.intro;
document.querySelectorAll('.sidebar-link').forEach(a=>{if(a.dataset.doc===doc){a.classList.add('active');a.setAttribute('aria-current','page')}});
$('related-links').innerHTML=(meta.related||[]).map(([label,key])=>'<a href="?doc='+encodeURIComponent(key)+'">'+escapeHtml(label)+' →</a>').join('')||'<a href="../">Browse all resources →</a>';
const toggle=$('mobile-nav-toggle');
toggle?.addEventListener('click',()=>{const open=$('reader-sidebar').classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))});
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);$('copy-link').textContent='Link copied ✓';setTimeout(()=>$('copy-link').textContent='Copy page link',2100)}catch{$('copy-link').textContent='Copy the URL from your browser';}});
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function slug(s){return s.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,90)||'section';}
function remap(relative){
 if(!relative||relative.startsWith('#')||/^(https?:|mailto:|tel:|data:)/i.test(relative))return relative;
 // Resolve relative filenames against the current original Markdown directory.
 const base=new URL('https://source.example/'+doc+'.md');
 const full=new URL(relative,base);
 const ext=full.pathname.split('/').pop()||'';
 if(!full.pathname.endsWith('.md')) return relative;
 const key=decodeURIComponent(full.pathname.slice(1,-3));
 if(Object.hasOwn(DATA,key))return '?doc='+encodeURIComponent(key)+(full.hash||'');
 if(key==='README'||key==='../README'||key==='')return '../';
 return '../';
}
async function run(){
 const target=$('guide-content');
 if(typeof window.marked==='undefined'||typeof window.DOMPurify==='undefined'){
   $('render-error').hidden=false;
   $('render-error').textContent='The documentation renderer could not load. Please refresh when you have a stable internet connection.';
   return;
 }
 try{
  const res=await fetch('../content/'+doc+'.md',{cache:'no-cache'});
  if(!res.ok) throw new Error('HTTP '+res.status);
  const source=await res.text();
  const renderer=new marked.Renderer();
  renderer.link=function({href,title,text}){const dest=remap(href);const external=/^https?:/i.test(dest);return '<a href="'+escapeHtml(dest||'#')+'"'+(title?' title="'+escapeHtml(title)+'"':'')+(external?' target="_blank" rel="noopener noreferrer"':'')+'>'+text+'</a>';};
  const markup=marked.parse(source,{gfm:true,breaks:false,renderer});
  target.innerHTML=DOMPurify.sanitize(markup,{USE_PROFILES:{html:true},ADD_ATTR:['target','rel','class']});
  const used=new Map();
  const heads=[...target.querySelectorAll('h2,h3')];
  const toc=$('toc');toc.replaceChildren();
  heads.forEach(h=>{
    const clean=h.textContent.trim();let id=slug(clean);
    const count=used.get(id)||0;used.set(id,count+1);if(count)id+='-'+(count+1);
    h.id=id;
    const a=document.createElement('a');a.textContent=clean.length>75?clean.slice(0,72)+'…':clean;a.href='#'+id;a.className=h.tagName==='H3'?'toc-h3':'toc-h2';toc.append(a);
  });
  target.querySelectorAll('table').forEach(t=>{const box=document.createElement('div');box.className='table-scroll';t.parentNode.insertBefore(box,t);box.append(t)});
  target.querySelectorAll('pre code.language-mermaid').forEach(code=>{
    const pre=code.closest('pre');const container=document.createElement('div');container.className='diagram-frame';
    const label=document.createElement('div');label.className='diagram-label';label.textContent='VISUAL PROCESS MAP';
    const chart=document.createElement('div');chart.className='mermaid';chart.textContent=code.textContent;
    container.append(label,chart);pre.replaceWith(container);
  });
  if(window.mermaid && target.querySelector('.mermaid')){
    try{mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'neutral',flowchart:{htmlLabels:false,useMaxWidth:false,curve:'basis'},themeVariables:{primaryColor:'#ecf2f6',primaryTextColor:'#102743',primaryBorderColor:'#9eb0bf',lineColor:'#8393a1',fontFamily:'DM Sans, Arial, sans-serif'}});await mermaid.run({querySelector:'#guide-content .mermaid'});}
    catch(err){console.warn('Diagram rendering failed; source retained',err);}
  }
  setupFind(target);
 }catch(err){console.error('Resource loading failed',err);$('render-error').hidden=false;$('reader-intro').textContent='The requested resource could not be retrieved.';}
}
function setupFind(root){
 const input=$('find-in-guide'),counter=$('find-count');
 let timer;
 input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>highlight(input.value.trim()),170)});
 function highlight(term){
  root.querySelectorAll('mark.mark-hit').forEach(mark=>mark.replaceWith(document.createTextNode(mark.textContent)));
  root.normalize();
  if(term.length<2){counter.textContent='';return}
  const matches=[];
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
    if(!node.parentElement||node.parentElement.closest('script,style,pre,code,a,svg'))return NodeFilter.FILTER_REJECT;
    return node.textContent.toLowerCase().includes(term.toLowerCase())?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
  }});
  let n;while((n=walk.nextNode())&&matches.length<100){matches.push(n)}
  let found=0,first;
  for(const node of matches){const s=node.textContent;const idx=s.toLowerCase().indexOf(term.toLowerCase());if(idx<0)continue;
   const before=document.createTextNode(s.slice(0,idx)),after=document.createTextNode(s.slice(idx+term.length));const mark=document.createElement('mark');mark.className='mark-hit';mark.textContent=s.slice(idx,idx+term.length);
   node.replaceWith(before,mark,after);first??=mark;found++;
  }
  counter.textContent=found?(found>=100?'100+ matches':found+' matches'):'No matches';
  first?.scrollIntoView({behavior:'smooth',block:'center'});
 }
}
run();
})();