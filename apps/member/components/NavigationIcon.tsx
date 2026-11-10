import data from './navigation.snapshot.json';
export default function NavigationIcon({name}:{name:string}){return <svg className="mnIcon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={data.icons[name as keyof typeof data.icons]||data.icons.grid}/></svg>;}
