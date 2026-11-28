export function setupPublicFooter(footer){
 if(!footer)return()=>{};const mobile=matchMedia('(max-width:700px)'),groups=[...footer.querySelectorAll('.footer-group')];
 const arrange=()=>groups.forEach(group=>{group.open=!mobile.matches;const summary=group.querySelector('summary');summary.tabIndex=mobile.matches?0:-1;});
 const preventDesktopToggle=event=>{if(!mobile.matches&&event.target.closest('summary'))event.preventDefault();};
 arrange();mobile.addEventListener('change',arrange);footer.addEventListener('click',preventDesktopToggle);
 return()=>{mobile.removeEventListener('change',arrange);footer.removeEventListener('click',preventDesktopToggle);};
}
