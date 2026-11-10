'use client';
import {usePathname} from 'next/navigation';
import MarketMessaging from './MarketMessaging';
import {MemberBreadcrumb} from './MemberNavigation';
export default function RouteChrome({header,children,publicFooter,publicHeader}:{header:React.ReactNode;children:React.ReactNode;publicFooter:React.ReactNode;publicHeader:React.ReactNode}){
 const path=usePathname();if(path==='/admin'||path.startsWith('/admin/')||path==='/industry-news'||path.startsWith('/industry-news/'))return <>{children}</>;
 return <><a className="skipMember" href="#member-main">Skip to content</a>{path.startsWith('/member')||path==='/onboarding'?header:publicHeader}<main id="member-main" tabIndex={-1}><MemberBreadcrumb/>{path.startsWith('/member/market')?<MarketMessaging>{children}</MarketMessaging>:children}</main>{!path.startsWith('/member')&&path!=='/onboarding'?publicFooter:<footer className="memberPageFooter"><div className="shell"><span>Mettelo · Connect. Build. Prove. Progress.</span><nav aria-label="Help and policies"><a href={path.startsWith('/member')?'/member/enquiries':'/contact'}>Support</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></div></footer>}</>;
}
