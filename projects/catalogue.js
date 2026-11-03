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
  if(typeof module!=='undefined')module.exports={matchesProject,compareProjectActivity};
  if(typeof document==='undefined')return;
  const form=document.getElementById('project-filters');

  const cards=Array.from(document.querySelectorAll('[data-project]')).map(element=>({element,reference:element.dataset.reference,title:element.dataset.title,recorded:false,search:element.dataset.search,track:element.dataset.track,sector:element.dataset.sector,roles:JSON.parse(element.dataset.roles)}));
  const keys=['q','track','sector','roles'];
  const count=document.getElementById('project-count'),empty=document.getElementById('project-empty');
  if(form){
  const params=new URLSearchParams(window.location.search);
  for(const key of keys){const input=form.elements.namedItem(key);const value=params.get(key)||'';if(input.tagName==='SELECT'){if(Array.from(input.options).some(option=>option.value===value))input.value=value;}else input.value=value;}
  function apply(){
    const query=Object.fromEntries(keys.map(key=>[key,form.elements.namedItem(key).value]));
    let visible=0;for(const card of cards){card.element.hidden=!matchesProject(card,query);if(!card.element.hidden)visible++;}
    const sort=form.elements.namedItem('sort').value;cards.sort((a,b)=>compareProjectActivity(a,b,sort));for(const card of cards)card.element.parentElement.append(card.element);
    count.textContent=`${visible} of ${cards.length} project briefs`;empty.hidden=visible!==0;
    const url=new URL(window.location.href);for(const key of keys){if(query[key])url.searchParams.set(key,query[key]);else url.searchParams.delete(key);}
    if(sort!=='active')url.searchParams.set('sort',sort);else url.searchParams.delete('sort');
    window.history.replaceState(null,'',url);
  }
  form.elements.namedItem('sort').value=['active','forming','title','reference'].includes(params.get('sort'))?params.get('sort'):'active';
  form.hidden=false;form.addEventListener('submit',event=>{event.preventDefault();apply();});form.addEventListener('input',apply);form.addEventListener('change',apply);form.addEventListener('reset',()=>window.setTimeout(apply,0));window.addEventListener('popstate',()=>{const params=new URLSearchParams(window.location.search);for(const key of keys)form.elements.namedItem(key).value=params.get(key)||'';form.elements.namedItem('sort').value=['active','forming','title','reference'].includes(params.get('sort'))?params.get('sort'):'active';apply();});apply();
  window.addEventListener('mettelo-pilot-activity',apply);
  }
  async function loadActivity(){
   try{const response=await fetch('/api/project-activity',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)return;const body=await response.json();if(!Array.isArray(body.projects))return;
    const activity=new Map(body.projects.map(item=>[item.project_ref,item]));
    for(const card of cards){const item=activity.get(card.reference);if(!item||item.recorded!==true)continue;Object.assign(card,{recorded:true,active_contributors:item.active_contributors,active_teams:item.active_teams,forming_teams:item.forming_teams});card.element.querySelector('[data-pilot-activity]').textContent=item.active_teams+' active teams · '+item.forming_teams+' forming · '+item.active_contributors+' active contributors';}
    const detail=document.querySelector('[data-pilot-detail]');if(detail){const item=activity.get(detail.dataset.pilotDetail);if(item?.recorded){const target=detail.querySelector('[data-pilot-team-list]');target.replaceChildren();const total=document.createElement('p');total.textContent=item.active_teams+' active teams · '+item.forming_teams+' forming · '+item.active_contributors+' distinct active contributors';target.append(total);
     if(!item.teams.length){const empty=document.createElement('p');empty.textContent='No teams are recorded yet. Express interest to help form a team.';target.append(empty);}
     for(const team of item.teams){const article=document.createElement('article');article.className='pilot-team-row';const title=document.createElement('h3');title.textContent=team.label;article.append(title);for(const text of ['Status: '+team.status,team.members+' confirmed members · minimum '+team.minimum_members,'Required roles: '+(team.required_roles.join(', ')||'No specific role requirement recorded'),'Filled roles: '+(team.filled_roles.join(', ')||'None recorded'),team.accepting_members?'Accepting additional members':'Not accepting additional members']){const p=document.createElement('p');p.textContent=text;article.append(p);}target.append(article);}
    }}
    window.dispatchEvent(new Event('mettelo-pilot-activity'));
   }catch{/* An unavailable feed is unknown activity, never a fabricated zero. */}
  }
  void loadActivity();
})();
