import type {Metadata} from 'next';
import './design-tokens.css';
import './member.css';
import './product-design.css';
import {MemberBreadcrumb} from '@/components/MemberNavigation';
import MemberAccountHeader from '@/components/MemberAccountHeader';
export const metadata:Metadata={title:'My Mettelo',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><a className="skipMember" href="#member-main">Skip to content</a><MemberAccountHeader/><main id="member-main" tabIndex={-1}><MemberBreadcrumb/>{children}</main><footer className="memberPageFooter"><div className="shell"><span>Mettelo · Connect. Build. Prove. Progress.</span><nav aria-label="Help and policies"><a href="/contact">Support</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></div></footer></body></html>;
}
