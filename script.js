const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
if(toggle&&nav){
document.documentElement.classList.add('js');
const host=nav.parentElement,wide=matchMedia('(min-width:1101px)'),panel=document.createElement('dialog');panel.className='navigationDrawer';panel.setAttribute('aria-label','Mettelo menu');const head=document.createElement('div');head.className='drawerHead';const title=document.createElement('div');title.innerHTML='<small>METTELO</small><strong>Menu</strong>';const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close navigation');head.append(title,close);panel.append(head);host.closest('header').append(panel);
function shut(focus=false){nav.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');nav.querySelectorAll('details').forEach(d=>d.open=false);if(panel.open)panel.close();if(focus)toggle.focus();}
function place(){shut();if(wide.matches)host.append(nav);else panel.append(nav);}
function decorate(){[...nav.children].forEach((link,i)=>{if(link.tagName!=='A')return;const text=link.textContent.trim(),href=link.getAttribute('href');if(href==='/'&&location.pathname==='/')link.setAttribute('aria-current','page');link.dataset.icon=({Home:'⌂',Projects:'▣',Opportunities:'☆'})[text]||'◎';if(i===0)link.dataset.group='Main';if(text==='Ecosystem')link.dataset.group='Mettelo';if(link.dataset.group&&!link.previousElementSibling?.classList.contains('drawerGroup')){const label=document.createElement('small');label.className='drawerGroup';label.textContent=link.dataset.group;link.before(label);}if(link.classList.contains('memberHomeSymbol'))link.textContent='Member home';if(link.dataset.memberRoute==='/signup'||href.endsWith('/signup')){link.classList.add('drawerJoin');link.textContent='Join Mettelo';}if(link.dataset.memberRoute==='/signin'||href.endsWith('/signin'))link.classList.add('drawerSignIn');});const j=nav.querySelector('.drawerJoin'),s=nav.querySelector('.drawerSignIn');if(j&&s&&j.nextElementSibling!==s)s.before(j);}
place();decorate();wide.addEventListener('change',place);close.addEventListener('click',()=>shut(true));panel.addEventListener('click',e=>{if(e.target===panel)shut(true);});panel.addEventListener('close',()=>shut());panel.addEventListener('cancel',()=>shut(true));panel.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...panel.querySelectorAll('a,button,summary')].filter(x=>!x.disabled&&x.getClientRects().length),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});toggle.addEventListener('click',()=>{if(panel.open){shut(true);return;}nav.classList.add('is-open');toggle.setAttribute('aria-expanded','true');panel.showModal();});nav.addEventListener('click',e=>{if(e.target.closest('a'))shut();});new MutationObserver(()=>{decorate();if(!nav.classList.contains('is-open')&&panel.open)panel.close();}).observe(nav,{attributes:true,attributeFilter:['class'],childList:true});
}
document.querySelectorAll('.nav a[href]').forEach(link=>{const url=new URL(link.href);if(url.origin===location.origin&&!url.hash&&url.pathname!=='/'&&(location.pathname===url.pathname||location.pathname.startsWith(url.pathname)))link.setAttribute('aria-current','page');});
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
(()=>{
const navigation=document.querySelector('#main-nav');if(!navigation)return;
const local=location.origin==='http://127.0.0.1:3002';const memberBase=local?'http://127.0.0.1:3001':'';
const guestLinks=[...navigation.children].map(link=>link.cloneNode(true));
const header=navigation.closest('header');
const brand=header.querySelector('.logo');const originalBrandHref=brand.getAttribute('href');
const calls=[...document.querySelectorAll('[data-member-route="/signup"],[data-member-route="/signin"],a[href$=":3001/signup"],a[href$=":3001/signin"]')].filter(link=>!navigation.contains(link)).map(link=>({link,href:link.getAttribute('href'),text:link.textContent,signin:link.dataset.memberRoute==='/signin'||link.getAttribute('href')===memberBase+'/signin'}));
let pending=false;
const restoreGuest=()=>{header.classList.remove('memberMode');header.querySelector('.signedInBrand')?.remove();header.querySelector('.memberTopHome')?.remove();header.querySelector('.publicAccount')?.remove();brand.setAttribute('href',originalBrandHref);navigation.setAttribute('aria-label','Main navigation');if(header.dataset.memberHeader==='true'){navigation.replaceChildren(...guestLinks.map(link=>link.cloneNode(true)));delete header.dataset.memberHeader;}calls.forEach(({link,href,text})=>{link.setAttribute('href',href);link.textContent=text;});document.querySelector('.home-availability')?.removeAttribute('hidden');};
async function refresh(){
if(pending)return;pending=true;
try{const response=await fetch('/api/navigation',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok){restoreGuest();return;}const account=await response.json();if(account.authenticated!==true||typeof account.name!=='string'){restoreGuest();return;}
header.querySelector('.publicAccount')?.remove();
const disclosure=document.createElement('details');disclosure.className='publicAccount';
const summary=document.createElement('summary');summary.setAttribute('aria-label','Your Mettelo account');
const avatar=document.createElement('span');avatar.className='publicAvatar';avatar.textContent=account.name.slice(0,1).toUpperCase();
if(typeof account.avatar==='string'){const url=new URL(account.avatar);if(url.protocol==='https:'){const img=document.createElement('img');img.src=url.href;img.alt='';img.width=32;img.height=32;avatar.replaceChildren(img);}}
const name=document.createElement('span');name.textContent=account.name.slice(0,40);summary.append(avatar,name);
const panel=document.createElement('div');panel.className='publicAccountPanel';
for(const [label,path]of [['My Mettelo','/member'],['Edit profile','/member/profile'],['Project interests','/member/applications'],['Saved opportunities','/member/saved-opportunities'],['Account & sign out','/member/account']]){const link=document.createElement('a');link.textContent=label;link.href=memberBase+path;panel.append(link);}
disclosure.append(summary,panel);disclosure.addEventListener('toggle',()=>{if(disclosure.open){toggle.setAttribute('aria-expanded','false');navigation.classList.remove('is-open');}});
const home=document.createElement('a');home.href=memberBase+'/member';home.className='memberHomeSymbol';home.setAttribute('aria-label','Member home');
const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','20');svg.setAttribute('height','20');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M3.5 10.5 12 3l8.5 7.5v9H15v-6H9v6H3.5Z');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.7');path.setAttribute('stroke-linejoin','round');svg.append(path);home.append(svg);
const memberLinks=[['Projects','/projects/'],['Project interests',memberBase+'/member/applications'],['Opportunities',memberBase+'/opportunities'],['Saved opportunities',memberBase+'/member/saved-opportunities']].map(([label,href])=>{const link=document.createElement('a');link.textContent=label;link.href=href;if(new URL(href,location.origin).pathname===location.pathname)link.setAttribute('aria-current','page');return link;});
header.querySelector('.memberTopHome')?.remove();const topHome=home.cloneNode(true);topHome.className='memberTopHome';toggle.before(topHome);
navigation.replaceChildren(home,...memberLinks);toggle.after(disclosure);navigation.setAttribute('aria-label','Member navigation');header.classList.add('memberMode');header.dataset.memberHeader='true';brand.href=memberBase+'/member';
if(!header.querySelector('.signedInBrand')){const label=document.createElement('span');label.className='signedInBrand';label.textContent='My Mettelo';brand.after(label);}
calls.forEach(({link,signin})=>{link.href=memberBase+(signin?'/member/account':'/member');link.textContent=signin?'Your account →':'Go to My Mettelo →';});document.querySelector('.home-availability')?.setAttribute('hidden','');

}catch{restoreGuest();}finally{pending=false;}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh();});
window.addEventListener('pageshow',event=>{if(event.persisted)void refresh();});
void refresh();
})();
document.addEventListener('toggle',event=>{const details=event.target;if(details instanceof HTMLDetailsElement&&details.closest('.nav')&&details.open)document.querySelectorAll('.nav details').forEach(other=>{if(other!==details)other.open=false;});},true);
document.addEventListener('click',event=>{const details=event.target.closest('.nav details');if(details&&event.target.closest('a'))details.open=false;});
document.addEventListener('pointerdown',event=>{document.querySelectorAll('.nav details').forEach(details=>{if(!details.contains(event.target))details.open=false;});});
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.nav details[open]').forEach(details=>{details.open=false;details.querySelector('summary')?.focus();});});
document.addEventListener('focusin',event=>{document.querySelectorAll('.nav details[open]').forEach(details=>{if(!details.contains(event.target))details.open=false;});if(nav?.classList.contains('is-open')&&!event.target.closest('.nav')){nav.classList.remove('is-open');toggle?.setAttribute('aria-expanded','false');}});
