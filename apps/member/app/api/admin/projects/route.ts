import {NextResponse} from 'next/server';
import {labSession} from '@/lib/lab';
import {projectDirectoryFilters} from '@/lib/project-directory.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const {db,user}=await labSession();
 const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
 if(!user)return respond({error:'Verified sign-in required.'},401);
 const url=new URL(request.url),filters=projectDirectoryFilters(Object.fromEntries(url.searchParams));
 const {data,error}=await db.rpc('website_project_admin_directory',{p_action:'candidates',p_payload:filters});
 if(error)return respond({error:error.code==='42501'?'Project administrator access required.':'Candidates could not load. Try again.'},error.code==='42501'?403:400);
 return respond(data);
}
