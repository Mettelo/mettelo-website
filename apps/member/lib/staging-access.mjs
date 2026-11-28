// Separate test-site access, not a member identity or administrator permission.
export async function stagingAccess(header,env=process.env){
 const user=env.METTELO_STAGING_USERNAME,hash=env.METTELO_STAGING_PASSWORD_SHA256;
 if(!user||!hash||!/^[a-f0-9]{64}$/.test(hash))return {configured:false,allowed:false};
 if(typeof header!=='string'||header.length>4096||!header.startsWith('Basic '))return {configured:true,allowed:false};
 try{
  const decoded=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(header.slice(6)),c=>c.charCodeAt(0))),split=decoded.indexOf(':');
  if(split<1||decoded.slice(0,split)!==user)return {configured:true,allowed:false};
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(decoded.slice(split+1))))).map(b=>b.toString(16).padStart(2,'0')).join('');
  let difference=0;for(let i=0;i<64;i++)difference|=digest.charCodeAt(i)^hash.charCodeAt(i);
  return {configured:true,allowed:difference===0};
 }catch{return {configured:true,allowed:false};}
}
