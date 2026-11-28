import {notFound,redirect} from 'next/navigation';
import {labSession} from '@/lib/lab';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token))notFound();
 const {db,user}=await labSession();if(!user)redirect('/signin?next='+encodeURIComponent('/member/market/recruitment/'+token));
 const {data,error}=await db.rpc('website_recruitment_sharing',{p_action:'resolve',p_payload:{token}});
 if(error||!data?.team_id)redirect('/collaborate/'+token);
 redirect('/member/market/projects/'+data.team_id);
}
