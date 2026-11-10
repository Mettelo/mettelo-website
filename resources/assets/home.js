(() => {
const input=document.getElementById('resource-search');
const cards=[...document.querySelectorAll('.resource-card')];
const count=document.getElementById('result-count');
const empty=document.getElementById('no-results');
function filter(){
 const q=(input.value||'').trim().toLocaleLowerCase('en-GB');
 let visible=0;
 for(const card of cards){const hay=(card.textContent+' '+card.dataset.keywords).toLocaleLowerCase('en-GB');const match=!q||q.split(/\s+/).every(s=>hay.includes(s));card.hidden=!match;if(match)visible++;}
 count.textContent=visible+' '+(visible===1?'resource':'resources');empty.hidden=visible!==0;
}
input?.addEventListener('input',filter);
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();input?.focus();}});
})();