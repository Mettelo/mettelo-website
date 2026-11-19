// Refresh the checked-in, framework-neutral Lucide subset after an icon change.
// Static builds use this snapshot and do not need React installed at the root.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const require=createRequire(new URL('apps/member/package.json',root));
const lucide=require('lucide-react'),{createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const names={grid:'LayoutGrid',briefcase:'BriefcaseBusiness',news:'Newspaper',people:'Users',compass:'Compass',layers:'Layers',book:'BookOpen',message:'MessageSquare',clipboard:'ClipboardList',person:'UserRound',settings:'Settings',exit:'LogOut',home:'House',menu:'Menu',close:'X',chevron:'ChevronRight',shield:'ShieldCheck',down:'ChevronDown',back:'ArrowLeft',forward:'ArrowRight',external:'ExternalLink',up:'ChevronUp',edit:'Pencil',trash:'Trash2',plus:'Plus',minus:'Minus',search:'Search',filter:'ListFilter',download:'Download',upload:'Upload',eye:'Eye',bell:'Bell',check:'Check',success:'CircleCheck',warning:'TriangleAlert',error:'CircleAlert',help:'CircleHelp',calendar:'CalendarDays',tasks:'ListTodo',file:'FileText',folder:'FolderOpen',more:'Ellipsis',mail:'Mail',save:'Bookmark',like:'ThumbsUp',showcase:'Presentation',lock:'LockKeyhole',loader:'LoaderCircle',circle:'Circle',square:'Square',share:'Share2',link:'Link',clock:'Clock3',play:'Play',send:'Send',arrowUp:'ArrowUp',eyeOff:'EyeOff',trophy:'Trophy'};
const icons=Object.fromEntries(Object.entries(names).map(([name,component])=>[name,renderToStaticMarkup(createElement(lucide[component],{size:20,strokeWidth:1.75})).replace(/^<svg[^>]*>|<\/svg>$/g,'').replace(/<([a-z]+)([^<>]*)><\/\1>/g,'<$1$2/>')]));
const target=new URL('shared/ui-icons.json',root);
writeFileSync(target,JSON.stringify({library:'lucide-react',version:require('lucide-react/package.json').version,names,icons},null,2)+'\n');
copyFileSync(target,new URL('apps/member/components/ui-icons.snapshot.json',root));
const navigation=new URL('shared/navigation.json',root),data=JSON.parse(readFileSync(navigation,'utf8'));
data.icons=Object.fromEntries(Object.keys(data.icons).map(name=>[name,icons[name]]));delete data.iconMarkup;writeFileSync(navigation,JSON.stringify(data)+'\n');
console.log(`Synchronised ${Object.keys(icons).length} Lucide icons for public and React interfaces.`);
