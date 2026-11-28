import AppIcon from '@/components/AppIcon';
type Name='like'|'comment'|'save'|'write'|'question'|'showcase'|'people'|'search'|'arrow'|'more'|'close';
const names:Record<Name,string>={like:'like',comment:'message',save:'save',write:'edit',question:'help',showcase:'showcase',people:'people',search:'search',arrow:'forward',more:'more',close:'close'};
export default function FeedIcon({name}:{name:Name}){return <AppIcon name={names[name]} size={18}/>;}
