(() => {
const recordings=new Set(['3aGN8qjMQm8','O6eZUWORtn8']);
document.querySelectorAll('[data-video]').forEach(button=>{
if(!recordings.has(button.dataset.video))return;
button.hidden=false;
button.addEventListener('click',()=>{
const frame=document.createElement('iframe');
frame.src=`https://www.youtube-nocookie.com/embed/${button.dataset.video}?rel=0`;
frame.title=`Mettelo workshop: ${button.dataset.videoTitle}`;
frame.allow='encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;
frame.referrerPolicy='strict-origin-when-cross-origin';frame.tabIndex=0;
button.closest('[data-video-stage]').replaceChildren(frame);frame.focus();
},{once:true});
});
})();
(()=>{const root=document.querySelector('#hero-path');if(!root)return;const track=root.querySelector('.hero-slides'),controls=root.querySelector('.hero-controls'),tabs=[...root.querySelectorAll('[data-slide]')],arrows=[...root.querySelectorAll('[data-step]')];let current=0;controls.hidden=false;function show(index){current=Math.max(0,Math.min(3,index));track.scrollTo({left:current*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}function sync(){current=Math.round(track.scrollLeft/track.clientWidth);root.querySelectorAll('.hero-slide').forEach((slide,i)=>slide.inert=i!==current);tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===current)));arrows[0].disabled=current===0;arrows[1].disabled=current===3;}tabs.forEach((tab,i)=>tab.addEventListener('click',()=>show(i)));arrows.forEach(button=>button.addEventListener('click',()=>show(current+Number(button.dataset.step))));track.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',()=>{track.scrollTo({left:current*track.clientWidth,behavior:'instant'});sync();});sync();})();
