import icons from './ui-icons.snapshot.json';

/** Artwork is a checked-in Lucide build snapshot, never user or API content.
 * Decorative by default: the enclosing button/link must supply its accessible name.
 */
export default function AppIcon({name,size=20,className=''}:{name:string;size?:16|18|20|24;className?:string}){
 const markup=icons.icons[name as keyof typeof icons.icons]||icons.icons.grid;
 return <svg className={`appIcon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{__html:markup}}/>;
}
