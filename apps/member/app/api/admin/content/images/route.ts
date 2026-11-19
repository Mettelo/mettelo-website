import {NextResponse} from 'next/server';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {labSession} from '@/lib/lab';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});const {data:cap}=await db.rpc('website_admin_capabilities');if(!cap?.roles)return NextResponse.json({error:'Full administrator access required.'},{status:403});
 try{if(Number(request.headers.get('content-length'))>6000000)throw Error('Choose an image under 5 MB.');const form=await request.formData(),file=form.get('image');if(!(file instanceof File)||file.size>5242880||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP image under 5 MB.');const input=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:20000000});const metadata=await input.metadata();if(!['jpeg','png','webp'].includes(metadata.format||''))throw Error('This image could not be read.');const resized=form.get('purpose')==='sharing'?input.rotate().resize(1200,630,{fit:'cover'}):input.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true});const bytes=await resized.webp({quality:85}).toBuffer();const path=user.id+'/'+randomUUID()+'.webp';const {error}=await db.storage.from('website-content-assets').upload(path,bytes,{contentType:'image/webp',upsert:false});if(error)throw Error('Image upload failed. Try again.');return NextResponse.json({url:db.storage.from('website-content-assets').getPublicUrl(path).data.publicUrl},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return NextResponse.json({error:(e as Error).message||'Image could not upload.'},{status:400});}
}
