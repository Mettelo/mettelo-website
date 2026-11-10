import type {Metadata} from 'next';
import './design-tokens.css';
import './member.css';
import './product-design.css';
import '@/components/lab/lab-experience.css';
import '@/components/participation.css';
import PublicAccountHeader from '@/components/PublicAccountHeader';
import PublicFooter from '@/components/PublicFooter';
import RouteChrome from '@/components/RouteChrome';
import MemberAccountHeader from '@/components/MemberAccountHeader';
export const metadata:Metadata={title:'My Mettelo',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><RouteChrome publicHeader={<PublicAccountHeader/>} publicFooter={<PublicFooter/>} header={<MemberAccountHeader/>}>{children}</RouteChrome></body></html>;
}
