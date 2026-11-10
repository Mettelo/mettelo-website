import Link from 'next/link';
import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import MemberNotifications from './MemberNotifications';
import MemberNavigation from './MemberNavigation';
import AccountMenu from './AccountMenu';
import PublicHeader from './PublicHeader';
import Icon from './NavigationIcon';
import {headerAccount} from '@/lib/header-account';
import './navigation.css';
export default async function MemberAccountHeader(){
 const website=publicWebsiteOrigin(),account=await headerAccount();
 if(!account)return <PublicHeader account={null}/>;
 return <><header className="memberHeader memberWorkspaceHeader"><Link className="memberWordmark" href="/member"><img src="/mettelo-logo.svg" alt="Mettelo" width="144" height="31"/></Link><span className="workspaceBrand">My Mettelo</span><a className="workspaceHomeIcon" href={website} aria-label="Public homepage"><Icon name="home"/></a><MemberNotifications/><AccountMenu account={account}/></header><MemberNavigation/></>;
}
