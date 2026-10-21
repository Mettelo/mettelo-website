// All enhancements stay in this browser. No analytics, search requests or new storage.
(() => {
  const finder=document.querySelector('[data-career-finder]');
  if(finder){
    const options={
      applications:{title:'Give your experience a clearer story.',description:'Start with the Resource Library for CV templates, application guidance and career toolkits. Peer feedback depends on community availability.',label:'Open application resources ↗',href:'https://1drv.ms/f/c/da3aa7b1d9999396/IgDj9KMf7GDaSqBXqX6uwbNZATwEB_HxJ4g7Yg_2vC2dI_Q?e=HDZUPE'},
      interviews:{title:'Prepare for the conversation ahead.',description:'Use interview preparation resources and recorded workshops to structure your practice. Ask the community about available peer support.',label:'Find interview support →',href:'/#interviews'},
      community:{title:'Find people to learn and build with.',description:'Join the Discord community for professional discussion and collaboration. Private spaces may require approval; follow the community guidelines.',label:'Open the Discord community ↗',href:'https://discord.gg/yy9qJZ7W'},
      projects:{title:'Put your knowledge to work.',description:'Browse practical projects, then use the separate participation form to express interest in contributing alone, with a team or as a lead.',label:'Explore the Project Library ↗',href:'https://mettelo.github.io/project-library/'}
    };
    const result=finder.querySelector('[data-finder-result]');
    finder.querySelector('fieldset').hidden=false;
    result.hidden=false;
    finder.querySelector('.finder-fallback').hidden=true;
    function show(value){const item=options[value];if(!item)return;result.querySelector('h3').textContent=item.title;result.querySelector('p').textContent=item.description;const link=result.querySelector('a');link.textContent=item.label;link.href=item.href;if(item.href.startsWith('https://')){link.target='_blank';link.rel='noopener noreferrer';}else{link.removeAttribute('target');link.removeAttribute('rel');}}
    finder.addEventListener('change',event=>{if(event.target.matches('input[name="career-goal"]'))show(event.target.value);});
    show('applications');
  }

  for(const directory of document.querySelectorAll('.essential-grid, #resources .links')){
    const links=[...directory.querySelectorAll('a.resource')];if(!links.length)continue;
    const control=document.createElement('div');control.className='resource-search';
    const label=document.createElement('label');label.textContent='Find a resource';
    const input=document.createElement('input');input.type='search';input.placeholder='Try “workshop”, “project” or “community”';input.autocomplete='off';label.append(input);
    const clear=document.createElement('button');clear.type='button';clear.textContent='Clear';control.append(label,clear);
    const count=document.createElement('p');count.className='resource-count';count.setAttribute('role','status');count.setAttribute('aria-live','polite');
    const empty=document.createElement('p');empty.className='resource-empty';empty.textContent='No matching resources. Try another word or clear your search.';empty.hidden=true;
    directory.before(control,count);directory.after(empty);
    function filter(){const words=input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);let visible=0;for(const link of links){link.hidden=!words.every(word=>link.textContent.toLowerCase().includes(word));if(!link.hidden)visible++;}count.textContent=`${visible} of ${links.length} resources`;empty.hidden=visible!==0;}
    input.addEventListener('input',filter);clear.addEventListener('click',()=>{input.value='';filter();input.focus();});filter();
  }

  const mobile=window.matchMedia('(max-width: 900px)');
  for(const sidebar of document.querySelectorAll('.guide-sidebar')){
    const nav=sidebar.matches('nav')?sidebar:sidebar.querySelector('nav');if(!nav)continue;
    const toggle=document.createElement('button');toggle.type='button';toggle.className='contents-toggle';toggle.textContent='On this page +';
    const list=nav.querySelector('ol');if(!list)continue;
    list.id=list.id||'page-contents';toggle.setAttribute('aria-controls',list.id);nav.prepend(toggle);
    function set(open){sidebar.classList.toggle('is-collapsed',!open);toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'On this page −':'On this page +';}
    set(!mobile.matches);toggle.addEventListener('click',()=>set(toggle.getAttribute('aria-expanded')!=='true'));mobile.addEventListener('change',()=>set(!mobile.matches));
    nav.addEventListener('click',event=>{const link=event.target.closest('a');if(link&&mobile.matches){set(false);const target=document.getElementById(link.hash.slice(1));if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}}});
  }
  const sectionLinks=[...document.querySelectorAll('.guide-sidebar a[href^="#"], .start-jump a[href^="#"]')];
  if('IntersectionObserver' in window&&sectionLinks.length){
    const observer=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(!visible.length)return;const id='#'+visible[0].target.id;for(const link of sectionLinks){if(link.getAttribute('href')===id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}},{rootMargin:'-100px 0px -55% 0px',threshold:0});
    for(const link of sectionLinks){const section=document.getElementById(link.hash.slice(1));if(section&&section.id!=='main')observer.observe(section);}
  }
  const copy=document.querySelector('[data-copy-email]');
  if(copy&&navigator.clipboard){copy.hidden=false;copy.addEventListener('click',async()=>{const status=document.querySelector('[data-copy-status]');try{await navigator.clipboard.writeText('hello@mettelo.com');status.textContent='Email address copied.';}catch{status.textContent='Copy is unavailable. Select hello@mettelo.com or use an email link below.';}});}
  const progressPanel=document.querySelector('.progress-panel');
  if(progressPanel){const next=document.createElement('a');next.className='next-checklist-step';progressPanel.append(next);const boxes=[...document.querySelectorAll('[data-step]')];function resume(){const box=boxes.find(item=>!item.checked);next.href=box?'#'+box.id:'#essentials';next.textContent=box?'Continue: '+box.labels[0].textContent.replace(/^\s*\d+\s*/,'').trim()+' →':'Explore your resources →';}document.querySelector('#checklist').addEventListener('change',resume);document.querySelector('.reset-progress').addEventListener('click',resume);resume();}
})();
