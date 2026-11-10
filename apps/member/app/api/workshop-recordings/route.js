import {latestRecordings,FALLBACK_IDS} from '@/lib/workshop-recordings.mjs';
export const runtime='nodejs';
export async function GET(request){
 const items=await latestRecordings();
 const thumbnail=new URL(request.url).searchParams.get('thumbnail');
 if(thumbnail!==null){
  if(!/^[\w-]{11}$/.test(thumbnail)||![...FALLBACK_IDS,...items.map(v=>v.id)].includes(thumbnail))return new Response(null,{status:404});
  try{const r=await fetch('https://i.ytimg.com/vi/'+thumbnail+'/hqdefault.jpg',{signal:AbortSignal.timeout(8000),redirect:'error',next:{revalidate:3600}});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error('No image');const body=await r.arrayBuffer();if(body.byteLength>2000000)throw Error('Image too large');return new Response(body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});}catch{return new Response(null,{status:502});}
 }
 return Response.json({recordings:items},{headers:{'Cache-Control':'public, max-age=300'}});
}
