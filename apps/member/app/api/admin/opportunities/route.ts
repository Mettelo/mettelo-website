import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {opportunityAdmin} from '@/lib/opportunities/admin';
import {prepareWebsiteOpportunityBatch} from '@/lib/opportunities/website-runner';
import {probeOpportunitySource} from '@/lib/opportunities/source-verification.mjs';
import {profileRequestOriginAllowed} from '@/lib/request-origin.mjs';
import {advanceDurableScan,durableScanProgress,durableScanCandidates} from '@/lib/opportunities/durable-workhub-scan.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function rpc(db:Awaited<ReturnType<typeof opportunityAdmin>>,action:string,payload:Record<string,unknown>={}){
 const {data,error}=await db.rpc('website_opportunity_admin',{p_action:action,p_payload:payload});
 if(error)throw Error(error.message);return data;
}
export async function POST(request:Request){
 if(!profileRequestOriginAllowed(request.headers.get('origin')))return NextResponse.json({error:'Request origin rejected.'},{status:403});
 let db;try{db=await opportunityAdmin();}catch{return NextResponse.json({error:'Administrator access required.'},{status:403});}
 try{
  if(Number(request.headers.get('content-length'))>2048)return NextResponse.json({error:'Request too large.'},{status:413});
  const raw=await request.text();if(raw.length>2048)return NextResponse.json({error:'Request too large.'},{status:413});
  const body=JSON.parse(raw);let result;
  if(body.action==='prepare')result=await rpc(db,'prepare',await prepareWebsiteOpportunityBatch(randomUUID(),await durableScanCandidates(db)));
  else if(body.action==='scan-civilservice')result=await advanceDurableScan(db,{restart:body.restart===true});
  else if(body.action==='publish')result=await rpc(db,'publish',{runId:body.runId});
  else if(body.action==='expire')result=await rpc(db,'expire');
  else if(body.action==='archive')result=await rpc(db,'archive',{id:body.id,reason:body.reason});
  else if(body.action==='verify'){
   const queue=await rpc(db,'queue');const counts={checked:0,expired:0,skipped:0,transient:0};
   for(const item of queue){
    const url=item.official_application_url||item.source_url;
    const check=await probeOpportunitySource(url,fetch,item.source_organisation);
    const recorded=await rpc(db,'record_check',{checkId:randomUUID(),id:item.id,url,state:check.state,httpStatus:'status' in check?check.status:null});
    if(recorded?.applied){counts.checked++;if(recorded.expired)counts.expired++;if(check.state==='skipped')counts.skipped++;if(check.state==='transient')counts.transient++;}
   }result=counts;
  }else return NextResponse.json({error:'Unknown action.'},{status:400});
  return NextResponse.json({result,state:{...await rpc(db,'list'),scanProgress:await durableScanProgress(db)}},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Operation not confirmed. Refresh before retrying.'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
