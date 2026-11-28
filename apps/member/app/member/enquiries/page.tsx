import {redirect} from 'next/navigation';
import {labSession,labRpc,type LabCard} from '@/lib/lab';
import SupportWorkspace from '@/components/lab/SupportWorkspace';
import '../lab/lab.css';
export const dynamic='force-dynamic';
export default async function Page(){const {db,user}=await labSession();if(!user)redirect('/signin?next=%2Fmember%2Fenquiries');const [data,cards]=await Promise.all([labRpc(db,'support_list',{personal:'true'}),labRpc(db,'mine')]);return <section className="section"><div className="shell"><SupportWorkspace cases={data.cases} placements={(cards as LabCard[]).map(c=>({team_id:c.team_id,title:c.title,label:c.label}))}/></div></section>;}
