import {labSession} from '@/lib/lab';
import {discoveryRpc} from '@/lib/market-discovery';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 const id=new URL(request.url).searchParams.get('member_id')||'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return new Response(null,{status:400,headers});
 const {db,user}=await labSession();if(!user)return new Response(null,{status:401,headers});
 try{const photo=await discoveryRpc(db,'avatar',{member_id:id});if(!photo?.path)return new Response(null,{status:404,headers});
 const {data,error}=await db.storage.from('website-profile-photos').download(photo.path);if(error||!data)return new Response(null,{status:404,headers});
 return new Response(data,{headers:{...headers,'Content-Type':'image/webp'}});
 }catch{return new Response(null,{status:404,headers});}
}
