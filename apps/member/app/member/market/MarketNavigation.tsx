import Link from 'next/link';
import AppIcon from '@/components/AppIcon';
const destinations=[
 {id:'feed',href:'/member/market',label:'Feed',icon:'grid'},
 {id:'people',href:'/member/market?tab=people',label:'People',icon:'people'},
 {id:'requests',href:'/member/market?tab=requests',label:'Activity',icon:'clipboard'}
] as const;
export default function MarketNavigation({active}:{active:string}){
 const section=['manage','proposals'].includes(active)?'requests':active==='projects'?'feed':active;
 return <nav className="marketPrimaryNav" aria-label="Mettelo Connect navigation">{destinations.map(item=><Link key={item.id} href={item.href} aria-label={item.id==='requests'?'Your activity':undefined} aria-current={item.id===section?'page':undefined}><AppIcon name={item.icon} size={18}/><span>{item.label}</span></Link>)}</nav>;
}

