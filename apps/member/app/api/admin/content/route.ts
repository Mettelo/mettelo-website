import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {contentAdmin} from '@/lib/site-content';
import {validateContent} from '@/lib/site-content-contract.mjs';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 const {db,user}=await labSession();if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});
 try{const raw=await request.text();if(raw.length>64000)return NextResponse.json({error:'Content is too large.'},{status:413});const body=JSON.parse(raw);if(!['save','publish','restore','project_status'].includes(body.action)||typeof body.key!=='string')throw Error('Choose a content action.');if(body.action==='save')validateContent(body.key,body.data);
 if(body.action==='project_status'){const result=await contentAdmin(db,'project_status',{key:body.key,state:body.state,expected_publication_version:body.expected_publication_version,confirmed:body.confirmed===true,note:body.note});return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});}
 const result=await contentAdmin(db,body.action,{key:body.key,data:body.data,expected_version:body.expected_version,confirmed:body.confirmed===true,note:body.note,revision_id:body.revision_id});return NextResponse.json({...result,document:await contentAdmin(db,'get',{key:body.key})},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){const error=e as {code?:string;message?:string};return NextResponse.json({error:['P0001','40001','42501'].includes(error.code||'')||e instanceof Error&&!error.code?error.message:'Your update could not be saved. Your entries are retained.'},{status:error.code==='42501'?403:error.code==='40001'?409:400});}
}
