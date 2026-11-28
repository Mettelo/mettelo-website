(() => {
function bind(button){
 if(!/^[\w-]{11}$/.test(button.dataset.video))return;
 button.hidden=false;
 button.addEventListener('click',()=>{
 const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+button.dataset.video+'?rel=0&autoplay=1';frame.title='Mettelo recording: '+button.dataset.videoTitle;frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.tabIndex=0;button.closest('[data-video-stage]').replaceChildren(frame);frame.focus();
 },{once:true});
}
document.querySelectorAll('[data-video]').forEach(bind);
async function refresh(){try{
 const response=await fetch('/api/workshop-recordings',{signal:AbortSignal.timeout(18000)});if(!response.ok)return;
 const {recordings}=await response.json();if(!Array.isArray(recordings)||recordings.length!==2||!recordings.every(v=>/^[\w-]{11}$/.test(v.id)&&typeof v.title==='string'&&v.title.trim()&&Number.isFinite(Date.parse(v.published))))return;
 const cards=[...document.querySelectorAll('.home-video-card')];
 // Leave a playing recording alone when fresh metadata arrives.
 if(cards.some(card=>card.querySelector('iframe')))return;
 recordings.forEach((video,index)=>{const card=cards[index];if(!card)return;const stage=card.querySelector('[data-video-stage]'),image=card.querySelector('img'),oldButton=stage.querySelector('button');if(!oldButton)return;
 const button=oldButton.cloneNode(true);oldButton.replaceWith(button);button.dataset.video=video.id;button.dataset.videoTitle=video.title;button.setAttribute('aria-label','Watch recording: '+video.title);bind(button);
 const thumb=new Image();if(image.src.indexOf(video.id)===-1)image.hidden=true;thumb.referrerPolicy='no-referrer';thumb.onload=()=>{image.src=thumb.src;image.hidden=false;};thumb.src='/api/workshop-recordings?thumbnail='+video.id;
 card.querySelector('h3').textContent=video.title;const time=card.querySelector('time');time.dateTime=video.published;time.textContent=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(video.published));card.querySelector('.home-video-copy a').href='https://www.youtube.com/watch?v='+video.id;
 });
}catch{/* Keep the curated recordings when the feed is unavailable. */}}
void refresh();
})();
(()=>{const root=document.querySelector('#hero-path');if(!root)return;const track=root.querySelector('.hero-slides'),controls=root.querySelector('.hero-controls'),tabs=[...root.querySelectorAll('[data-slide]')],arrows=[...root.querySelectorAll('[data-step]')];let current=0;controls.hidden=false;function show(index){current=Math.max(0,Math.min(3,index));track.scrollTo({left:current*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}function sync(){current=Math.round(track.scrollLeft/track.clientWidth);root.querySelectorAll('.hero-slide').forEach((slide,i)=>slide.inert=i!==current);tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===current)));arrows[0].disabled=current===0;arrows[1].disabled=current===3;}tabs.forEach((tab,i)=>tab.addEventListener('click',()=>show(i)));arrows.forEach(button=>button.addEventListener('click',()=>show(current+Number(button.dataset.step))));track.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',()=>{track.scrollTo({left:current*track.clientWidth,behavior:'instant'});sync();});sync();})();
