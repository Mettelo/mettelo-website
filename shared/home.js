// All enhancements stay in this browser. No analytics, search requests or new storage.
(() => {
  const finder=document.querySelector('[data-career-finder]');
  if(finder){
    const options={
      applications:{title:'Give your experience a clearer story.',description:'Community access: join to explore CV templates, application guidance and career toolkits.',label:'Access application tools',href:'https://tally.so/r/J9b5zd'},
      interviews:{title:'Prepare for the conversation ahead.',description:'Community access: join to explore interview preparation materials and ask about available peer support.',label:'Access interview resources',href:'https://tally.so/r/J9b5zd'},
      community:{title:'Find people to learn and build with.',description:'Join the Discord community for professional discussion and collaboration. Private spaces may require approval; follow the community guidelines.',label:'Open the Discord community',href:'https://discord.gg/yy9qJZ7W'},
      projects:{title:'Put your knowledge to work.',description:'Browse practical projects, then use the separate participation form to express interest in contributing alone, with a team or as a lead.',label:'Explore the Project Library',href:'https://mettelo.github.io/project-library/'}
    };
    const result=finder.querySelector('[data-finder-result]');
    finder.querySelector('fieldset').hidden=false;
    result.hidden=false;
    finder.querySelector('.finder-fallback').hidden=true;
    function show(value){const item=options[value];if(!item)return;result.querySelector('h3').textContent=item.title;result.querySelector('p').textContent=item.description;const link=result.querySelector('a');link.textContent=item.label;link.href=item.href;if(item.href.startsWith('https://')){link.target='_blank';link.rel='noopener noreferrer';}else{link.removeAttribute('target');link.removeAttribute('rel');}}
    finder.addEventListener('change',event=>{if(event.target.matches('input[name="career-goal"]'))show(event.target.value);});
    show('applications');
  }

})();
