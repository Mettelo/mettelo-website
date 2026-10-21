// All enhancements stay in this browser. No analytics, search requests or new storage.
(() => {
  const finder=document.querySelector('[data-career-finder]');
  if(finder){
    const options={
      applications:{title:'Give your experience a clearer story.',description:'Start with the Resource Library for CV templates, application guidance and career toolkits. Peer feedback depends on community availability.',label:'Open application resources',href:'https://1drv.ms/f/c/da3aa7b1d9999396/IgDj9KMf7GDaSqBXqX6uwbNZATwEB_HxJ4g7Yg_2vC2dI_Q?e=HDZUPE'},
      interviews:{title:'Prepare for the conversation ahead.',description:'Use interview preparation resources and recorded workshops to structure your practice. Ask the community about available peer support.',label:'Find interview support',href:'/#interviews'},
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
