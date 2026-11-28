import {discoveryRpc} from '@/lib/market-discovery';
import MarketConnectionsPanel from './MarketConnectionsPanel';
export default async function MarketConnections({db,memberId,userId}:{db:Parameters<typeof discoveryRpc>[0];memberId:string;userId:string}){
 try{const data=await discoveryRpc(db,'connections',{member_id:memberId});if(!data)return null;return <MarketConnectionsPanel memberId={memberId} userId={userId} initial={data}/>;}
 catch{return <section className="marketConnections"><h2>Community connections</h2><p>Connections could not load. Reload to try again.</p></section>;}
}
