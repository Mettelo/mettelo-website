import PublicHeader from '@/components/PublicHeader';
import {headerAccount} from '@/lib/header-account';
export default async function PublicAccountHeader(){return <PublicHeader account={await headerAccount()}/>;}
