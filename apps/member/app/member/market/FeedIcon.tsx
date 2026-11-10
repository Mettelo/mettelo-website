type Name='like'|'comment'|'save'|'write'|'question'|'showcase'|'people'|'search'|'arrow'|'more'|'close';
export default function FeedIcon({name}:{name:Name}){
 const paths:Record<Name,React.ReactNode>={
  like:<path d="M7 10v10H3V10h4Zm0 0 5-7c2 0 3 1 2 4l-1 3h5a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 1H7"/>,
  comment:<path d="M20 11a8 8 0 0 1-8 8H5l-3 3v-8a8 8 0 1 1 18-3Z"/>,
  save:<path d="M6 3h12v18l-6-4-6 4V3Z"/>,write:<><path d="m14 4 6 6M4 20l5-1L21 7l-5-5L4 14v6Z"/></>,
  question:<><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/></>,
  showcase:<><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21l4-5 4 5M7 11l3-3 3 3 4-5"/></>,
  people:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/></>,
  search:<><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,close:<path d="m6 6 12 12M6 18 18 6"/>
 };
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
