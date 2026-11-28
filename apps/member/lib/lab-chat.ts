import 'server-only';
import {labRpc,labSession} from './lab';
export type ChatMessage={id:string;author_user_id:string;message_type:string;body:string;mentioned_user_ids:string[];created_at:string;updated_at?:string;edited_at?:string|null;deleted_at?:string|null;pinned_at?:string|null};
export async function chatRead(request:Request){
 const {db,user}=await labSession();if(!user)throw Error('AUTH_REQUIRED');
 const params=new URL(request.url).searchParams;
 return labRpc(db,'chat_snapshot',{team_id:params.get('project_run_id'),project_ref:params.get('project_id')});
}
export async function chatWrite(request:Request,link=false){
 const {db,user}=await labSession();if(!user)throw Error('AUTH_REQUIRED');
 const raw=await request.text();if(raw.length>16000)throw Error('Write a shorter message.');
 const body=JSON.parse(raw);const action=link?'chat_link':body.action;
 if(!['discussion','discussion_edit','discussion_delete','discussion_pin','discussion_classify','chat_link'].includes(action))throw Error('Unsupported Chat action.');
 return labRpc(db,action,{team_id:body.project_run_id,project_ref:body.project_id,message_id:body.message_id,
  body:body.body,message_type:body.message_type,mentioned_user_ids:body.mentioned_user_ids||[],pinned:body.pinned,
  entity_id:body.entity_id,client_nonce:body.client_nonce});
}
export function chatError(error:unknown){
 const e=error as {code?:string;message?:string};return {status:e.message==='AUTH_REQUIRED'?401:e.code==='42501'?403:409,
  message:e.message==='AUTH_REQUIRED'?'Sign in to use Team Chat.':e.code==='P0001'?e.message:'This Chat request could not be completed. Refresh your team workspace and try again.'};
}
