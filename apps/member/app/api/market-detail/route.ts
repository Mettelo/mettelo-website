import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {discoveryRpc} from '@/lib/market-discovery';
import {proposalRpc} from '@/lib/market-proposals';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:Request){
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Verified sign-in required.'},{status:401,headers});
 const query=new URL(request.url).searchParams,kind=query.get('kind'),id=query.get('id');
 if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!['project','proposal'].includes(kind||''))return NextResponse.json({error:'Choose a valid project.'},{status:400,headers});
 try{
  if(kind==='project'){const project=await discoveryRpc(db,'project',{team_id:id});if(!project?.team_id)throw Error('Unavailable');return NextResponse.json({project},{headers});}
  const {proposal}=await proposalRpc(db,'detail',{proposal_id:id});
  if(!proposal||proposal.state!=='approved')return NextResponse.json({error:'This public project is unavailable.'},{status:404,headers});
  const publicFields=['id','title','description','problem','outcome','milestones','category','skills','commitment','collaboration','participation','supporting_url','state','project_ref'];
  return NextResponse.json({proposal:Object.fromEntries(publicFields.filter(key=>key in proposal).map(key=>[key,proposal[key]]))},{headers});
 }catch{return NextResponse.json({error:'This project is unavailable. It may no longer be shared.'},{status:503,headers});}
}
