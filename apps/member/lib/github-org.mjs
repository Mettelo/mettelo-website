import {createSign} from 'node:crypto';
export const githubLogin=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(value);
export function githubConfiguration(env=process.env){
 const organisation=env.METTELO_GITHUB_ORGANISATION||'Mettelo';
 const appId=env.METTELO_GITHUB_APP_ID||'',installationId=env.METTELO_GITHUB_APP_INSTALLATION_ID||'',privateKey=(env.METTELO_GITHUB_APP_PRIVATE_KEY||'').replaceAll('\\n','\n');
 const enabled=env.METTELO_GITHUB_INVITATIONS_ENABLED==='true';
 return {organisation,appId,installationId,privateKey,enabled,configured:enabled&&githubLogin(organisation)&&/^\d+$/.test(appId)&&/^\d+$/.test(installationId)&&privateKey.includes('PRIVATE KEY')&&Boolean(env.METTELO_GITHUB_SUPABASE_SERVICE_ROLE_KEY)};
}
export class GitHubConnectionError extends Error{constructor(code,status=0){super(code);this.code=code;this.status=status}}
export function appJwt(config,now=Date.now()){
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const at=Math.floor(now/1000);const body=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iat:at-60,exp:at+540,iss:config.appId});
 const sign=createSign('RSA-SHA256');sign.update(body);sign.end();return body+'.'+sign.sign(config.privateKey,'base64url');
}
export async function githubInstallation(config,{fetcher=fetch,now=Date.now()}={}){
 if(!config.configured)throw new GitHubConnectionError('setup_required');
 const jwt=appJwt(config,now);
 async function call(path,token,method='GET',body){
  let response;try{response=await fetcher('https://api.github.com'+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2026-03-10','User-Agent':'Mettelo-membership','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(7000),cache:'no-store'});}catch{throw new GitHubConnectionError(method==='POST'?'delivery_unknown':'github_unavailable')}
  let data={};try{data=response.status===204?{}:await response.json()}catch{}
  if(!response.ok)throw new GitHubConnectionError(response.status===429?'rate_limited':response.status===403?'permission_required':'github_request_failed',response.status);
  return data;
 }
 const installation=await call('/app/installations/'+config.installationId,jwt);
 if(installation.account?.login?.toLowerCase()!==config.organisation.toLowerCase()||installation.target_type!=='Organization'||installation.permissions?.members!=='write')throw new GitHubConnectionError('organisation_permission_required');
 const access=await call('/app/installations/'+config.installationId+'/access_tokens',jwt,'POST',{permissions:{members:'write'}});
 if(!access.token)throw new GitHubConnectionError('github_unavailable');
 return {call:(path,method,body)=>call(path,access.token,method,body)};
}
export async function inviteGithubMember(config,githubId,options={}){
 if(!/^[1-9][0-9]{0,18}$/.test(String(githubId))||!Number.isSafeInteger(Number(githubId)))throw new GitHubConnectionError('invalid_identity');
 const api=await githubInstallation(config,options),account=await api.call('/user/'+githubId);
 if(String(account.id)!==String(githubId)||!githubLogin(account.login))throw new GitHubConnectionError('identity_mismatch');
 const path='/orgs/'+encodeURIComponent(config.organisation)+'/memberships/'+encodeURIComponent(account.login);
 let membership;try{membership=await api.call(path)}catch(e){if(e.status!==404)throw e}
 if(membership?.state==='active')return {org_status:'member',login:account.login};
 if(membership?.state==='pending')return {org_status:'pending',login:account.login};
 if(options.previousStatus==='member')return {org_status:'failed',login:account.login,error_code:'organisation_access_removed'};
 if(options.priorInvitationId&&!options.allowResend)return {org_status:'failed',login:account.login,invitation_id:options.priorInvitationId,error_code:'invitation_needs_resend'};
 try{const invitation=await api.call('/orgs/'+encodeURIComponent(config.organisation)+'/invitations','POST',{invitee_id:Number(githubId),role:'direct_member'});return {org_status:'pending',login:account.login,invitation_id:invitation.id};}
 catch(e){if(e.status===422){try{membership=await api.call(path);if(['active','pending'].includes(membership.state))return {org_status:membership.state==='active'?'member':'pending',login:account.login};}catch{}}throw e;}
}
