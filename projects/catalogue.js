(function(){
  'use strict';
  function matchesProject(project,query){
    const words=String(query.q||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
    return words.every(word=>project.search.includes(word))&&(!query.track||project.track===query.track)&&(!query.sector||project.sector===query.sector)&&(!query.roles||project.roles.includes(query.roles));
  }
  function compareProjectActivity(a,b,sort='active'){
    if(sort==='title')return a.title.localeCompare(b.title)||a.reference.localeCompare(b.reference);
    if(sort==='reference')return a.reference.localeCompare(b.reference);
    const score=(p,key)=>p.recorded?Number(p[key]||0):-1;
    const primary=sort==='forming'?'forming_teams':'active_contributors';
    return score(b,primary)-score(a,primary)||score(b,'active_teams')-score(a,'active_teams')||a.reference.localeCompare(b.reference);
  }
  function paginateProjects(items,page,size=8){
    const totalPages=Math.max(1,Math.ceil(items.length/size));
    const current=Math.min(totalPages,Math.max(1,Number.isSafeInteger(Number(page))?Number(page):1));
    const start=(current-1)*size;
    return {items:items.slice(start,start+size),page:current,totalPages,start};
  }
  if(typeof module!=='undefined')module.exports={matchesProject,compareProjectActivity,paginateProjects};
  if(typeof document==='undefined')return;
  const form=document.getElementById('project-filters');

  const cards=Array.from(document.querySelectorAll('[data-project]')).map(element=>({element,reference:element.dataset.reference,title:element.dataset.title,recorded:false,search:element.dataset.search,track:element.dataset.track,sector:element.dataset.sector,roles:JSON.parse(element.dataset.roles)}));
  const keys=['q','track','sector','roles'];
  const count=document.getElementById('project-count'),empty=document.getElementById('project-empty');
  if(form){
  const params=new URLSearchParams(window.location.search);
  for(const key of keys){const input=form.elements.namedItem(key);const value=params.get(key)||'';if(input.tagName==='SELECT'){if(Array.from(input.options).some(option=>option.value===value))input.value=value;}else input.value=value;}
  let currentPage=params.get('page')||1;
  const grid=document.querySelector('.project-grid');
  const pagers=['top','bottom'].map(position=>{
    const nav=document.createElement('nav');nav.className='catalogue-pagination';nav.setAttribute('aria-label','Project pages ('+position+')');
    grid[position==='top'?'before':'after'](nav);return nav;
  });
  function apply(){
    const query=Object.fromEntries(keys.map(key=>[key,form.elements.namedItem(key).value]));
    const sort=form.elements.namedItem('sort').value;
    const matching=cards.filter(card=>matchesProject(card,query)).sort((a,b)=>compareProjectActivity(a,b,sort));
    const result=paginateProjects(matching,currentPage);currentPage=result.page;
    const shown=new Set(result.items);for(const card of cards)card.element.hidden=!shown.has(card);
    for(const card of matching)grid.append(card.element);
    count.textContent=matching.length?'Showing '+(result.start+1)+'–'+(result.start+result.items.length)+' of '+matching.length+' project briefs':'0 project briefs';
    empty.hidden=matching.length!==0;
    for(const nav of pagers){
      nav.replaceChildren();nav.hidden=result.totalPages<=1;
      function add(label,page,disabled,active){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=disabled;if(active)button.setAttribute('aria-current','page');button.setAttribute('aria-label',label==='Previous'||label==='Next'?label+' project page':'Page '+page);button.addEventListener('click',()=>{currentPage=page;apply();pagers[0].scrollIntoView({block:'start',behavior:'instant'});const target=pagers[0].querySelector('[aria-current="page"]');target?.focus({preventScroll:true});});nav.append(button);}
      add('Previous',currentPage-1,currentPage===1,false);
      for(let page=1;page<=result.totalPages;page++)add(String(page),page,false,page===currentPage);
      add('Next',currentPage+1,currentPage===result.totalPages,false);
    }
    const url=new URL(window.location.href);for(const key of keys){if(query[key])url.searchParams.set(key,query[key]);else url.searchParams.delete(key);}
    if(sort!=='active')url.searchParams.set('sort',sort);else url.searchParams.delete('sort');
    if(currentPage>1)url.searchParams.set('page',currentPage);else url.searchParams.delete('page');
    window.history.replaceState(null,'',url);
  }
  form.elements.namedItem('sort').value=['active','forming','title','reference'].includes(params.get('sort'))?params.get('sort'):'active';
  const resetPage=()=>{currentPage=1;apply();};form.hidden=false;form.addEventListener('submit',event=>{event.preventDefault();resetPage();});form.addEventListener('input',resetPage);form.addEventListener('change',resetPage);form.addEventListener('reset',()=>window.setTimeout(resetPage,0));window.addEventListener('popstate',()=>{const params=new URLSearchParams(window.location.search);currentPage=params.get('page')||1;for(const key of keys)form.elements.namedItem(key).value=params.get(key)||'';form.elements.namedItem('sort').value=['active','forming','title','reference'].includes(params.get('sort'))?params.get('sort'):'active';apply();});apply();
  window.addEventListener('mettelo-pilot-activity',apply);
  }
  async function loadActivity(){
   try{const response=await fetch('/api/project-activity',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)return;const body=await response.json();if(!Array.isArray(body.projects))return;
    const activity=new Map(body.projects.map(item=>[item.project_ref,item]));
    for(const card of cards){const item=activity.get(card.reference);if(!item||item.recorded!==true)continue;Object.assign(card,{recorded:true,active_contributors:item.active_contributors,active_teams:item.active_teams,forming_teams:item.forming_teams});const target=card.element.querySelector('[data-pilot-activity]');if(target)target.textContent=item.active_teams+' active teams · '+item.forming_teams+' forming · '+item.active_contributors+' active contributors';}
    const detail=document.querySelector('[data-pilot-detail]');if(detail){const item=activity.get(detail.dataset.pilotDetail);if(item?.recorded){const target=detail.querySelector('[data-pilot-team-list]');target.replaceChildren();const total=document.createElement('p');total.textContent=item.active_teams+' active teams · '+item.forming_teams+' forming · '+item.active_contributors+' distinct active contributors';target.append(total);
     if(!item.teams.length){const empty=document.createElement('p');empty.textContent='No teams are recorded yet. Express interest to help form a team.';target.append(empty);}
     for(const team of item.teams){const article=document.createElement('article');article.className='pilot-team-row';const title=document.createElement('h3');title.textContent=team.label;article.append(title);for(const text of ['Status: '+team.status,team.members+' confirmed members · minimum '+team.minimum_members,'Required roles: '+(team.required_roles.join(', ')||'No specific role requirement recorded'),'Filled roles: '+(team.filled_roles.join(', ')||'None recorded'),team.accepting_members?'Accepting additional members':'Not accepting additional members']){const p=document.createElement('p');p.textContent=text;article.append(p);}target.append(article);}
    }}
    window.dispatchEvent(new Event('mettelo-pilot-activity'));
   }catch{/* An unavailable feed is unknown activity, never a fabricated zero. */}
  }
  if(document.querySelector('[data-pilot-activity],[data-pilot-detail]'))void loadActivity();
})();
