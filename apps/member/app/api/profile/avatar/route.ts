import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const runtime='nodejs';
const bucket='website-profile-photos';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function change(request:Request,remove:boolean){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return reply({error:'Invalid request origin.'},403);
 const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();
 if(!user?.email_confirmed_at)return reply({error:'Verify your email and sign in first.'},401);
 const {data:profile,error}=await db.from('profiles').select('avatar_path').eq('id',user.id).single();
 if(error)return reply({error:'Your photo could not be loaded.'},503);
 let path:string|null=null;
 if(!remove){
  if(Number(request.headers.get('content-length'))>6*1024*1024)return reply({error:'Choose a photo no larger than 5 MB.'},413);
  let bytes:Buffer;
  try{
   const reader=request.body?.getReader();if(!reader)throw new Error();
   const chunks:Uint8Array[]=[];let total=0;
   while(true){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>6*1024*1024){await reader.cancel();return reply({error:'Choose a photo no larger than 5 MB.'},413);}chunks.push(part.value);}
   const payload=new Uint8Array(total);let offset=0;for(const chunk of chunks){payload.set(chunk,offset);offset+=chunk.length;}
   const form=await new Response(payload,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();const file=form.get('avatar');
   if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024||!file.size)return reply({error:'Choose a JPG, PNG or WebP photo up to 5 MB.'},400);
   const input=Buffer.from(await file.arrayBuffer());const image=sharp(input,{limitInputPixels:16000000,animated:false});
   const metadata=await image.metadata();if(!['jpeg','png','webp'].includes(metadata.format||'')||(metadata.pages||1)>1)throw new Error();
   bytes=await image.rotate().resize(512,512,{fit:'cover',withoutEnlargement:true}).webp({quality:82}).toBuffer();
   if(bytes.length>1048576)throw new Error();
  }catch{return reply({error:'This image could not be read. Choose a different JPG, PNG or WebP photo.'},400);}
  path=`${user.id}/${randomUUID()}.webp`;
  const upload=await db.storage.from(bucket).upload(path,bytes,{contentType:'image/webp',upsert:false,cacheControl:'60'});
  if(upload.error)return reply({error:'Your photo could not be uploaded. Please try again.'},503);
 }
 let update=db.from('profiles').update({avatar_path:path}).eq('id',user.id);
 update=profile.avatar_path?update.eq('avatar_path',profile.avatar_path):update.is('avatar_path',null);
 const result=await update.select('avatar_path').maybeSingle();
 if(result.error||!result.data){if(path)await db.storage.from(bucket).remove([path]);return reply({error:'Your photo changed in another session. Refresh before trying again.'},409);}
 if(profile.avatar_path)await db.storage.from(bucket).remove([profile.avatar_path]);
 return reply({ok:true});
}
export async function POST(request:Request){return change(request,false);}
export async function DELETE(request:Request){return change(request,true);}
