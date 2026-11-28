import {createSign,createPrivateKey} from 'node:crypto';
export const githubLogin=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(value);
function privateKeyFromSetting(value){
 const slash=String.fromCharCode(92),newline=String.fromCharCode(10);
 let raw=String(value||'').trim();
 while(raw.includes(slash+slash))raw=raw.replaceAll(slash+slash,slash);
 raw=raw.replaceAll(slash+'r'+slash+'n',newline).replaceAll(slash+'n',newline).trim();
 if((raw.startsWith('"')&&raw.endsWith('"'))||(raw.startsWith("'")&&raw.endsWith("'")))raw=raw.slice(1,-1).trim();
 // Hosting text fields can flatten PEM line breaks. Re-wrap only a complete,
 // matching private-key envelope and base64 body; never infer missing key data.
 const pem=raw.match(/^-----BEGIN (RSA PRIVATE KEY|PRIVATE KEY)-----\s*([A-Za-z0-9+/=\s]+?)\s*-----END \1-----$/);
 if(!pem)return '';
 const body=pem[2].replace(/\s/g,'');
 const normalised='-----BEGIN '+pem[1]+'-----\n'+(body.match(/.{1,64}/g)||[]).join('\n')+'\n-----END '+pem[1]+'-----\n';
 try{return createPrivateKey(normalised).asymmetricKeyType==='rsa'?normalised:''}catch{return ''}
}
export function githubConfiguration(env=process.env){
 const organisation=env.METTELO_GITHUB_ORGANISATION||'Mettelo';
 const appId=env.METTELO_GITHUB_APP_ID||'',installationId=env.METTELO_GITHUB_APP_INSTALLATION_ID||'',privateKey=privateKeyFromSetting(env.METTELO_GITHUB_APP_PRIVATE_KEY);
 const enabled=env.METTELO_GITHUB_INVITATIONS_ENABLED==='true';
 return {organisation,appId,installationId,privateKey,enabled,configured:enabled&&githubLogin(organisation)&&/^\d+$/.test(appId)&&/^\d+$/.test(installationId)&&Boolean(privateKey)&&Boolean(env.METTELO_GITHUB_SUPABASE_SERVICE_ROLE_KEY)};
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
