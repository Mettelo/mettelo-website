const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function memberManagementRequest(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||!['list','detail','suspend','restore','set_role'].includes(body.action))throw Error('Unsupported member action.');
 const action=body.action;
 if(action==='list'){
 const q=body.q??'',status=body.status??'all',page=body.page??1;
 if(typeof q!=='string'||q.length>100||!['all','active','suspended','unverified'].includes(status)||!Number.isSafeInteger(page)||page<1||page>100000)throw Error('Check your member search and filters.');
 return {action,payload:{q:q.trim(),status,page}};
 }
 if(typeof body.user_id!=='string'||!uuid.test(body.user_id))throw Error('Invalid member.');
 if(action==='detail')return {action,payload:{user_id:body.user_id}};
 if(action==='set_role'){
 if(!['member','writer','editor','operations_admin','full_admin'].includes(body.role)||!Number.isSafeInteger(body.role_version)||body.role_version<0)throw Error('Choose a supported role and refresh the member record.');
 if(typeof body.reason!=='string'||body.reason.trim().length<8||body.reason.trim().length>500)throw Error('Record a reason between 8 and 500 characters.');
 if(typeof body.confirmation!=='string'||!body.confirmation.trim()||body.confirmation.length>320)throw Error('Type the member email to confirm.');
 return {action,payload:{user_id:body.user_id,role:body.role,role_version:body.role_version,reason:body.reason.trim(),confirmation:body.confirmation.trim()}};
 }
 if(!Number.isSafeInteger(body.version)||body.version<0)throw Error('Refresh the member record before continuing.');
 if(typeof body.reason!=='string'||body.reason.trim().length<8||body.reason.trim().length>500)throw Error('Record a reason between 8 and 500 characters.');
 if(typeof body.confirmation!=='string'||body.confirmation.length>320||!body.confirmation.trim())throw Error('Type the member email to confirm.');
 return {action,payload:{user_id:body.user_id,version:body.version,reason:body.reason.trim(),confirmation:body.confirmation.trim()}};
}
