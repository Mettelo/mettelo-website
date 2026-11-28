import {labSession} from '@/lib/lab';
import {discoveryRpc} from '@/lib/market-discovery';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'},query=new URL(request.url).searchParams,id=query.get('member_id')||'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return Response.json({error:'Invalid member.'},{status:400,headers});
 const {db,user}=await labSession();if(!user)return Response.json({error:'Verified sign-in required.'},{status:401,headers});
 try{const data=await discoveryRpc(db,'connections',{member_id:id,direction:query.get('direction')==='following'?'following':'followers',page:Math.max(1,Math.min(10000,Number.parseInt(query.get('page')||'1',10)||1))});return Response.json(data,{headers});}
 catch{return Response.json({error:'These connections could not be loaded.'},{status:403,headers});}
}
