import PublicFooter from '@/components/PublicFooter';
import PublicNewsChrome from '@/components/news/PublicNewsChrome';
import {headerAccount} from '@/lib/header-account';
import './news.css';
export const dynamic='force-dynamic';
export const metadata={metadataBase:new URL('https://mettelo.com'),title:'Industry News | Mettelo',robots:{index:false,follow:false}};
export default async function Layout({children}:{children:React.ReactNode}){const account=await headerAccount();return <PublicNewsChrome account={account} footer={<PublicFooter/>}>{children}</PublicNewsChrome>;}
