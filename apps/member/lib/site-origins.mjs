export const STAGING_ORIGIN='https://staging.mettelo.com';
export function publicWebsiteOrigin(){
 const configured=process.env.NEXT_PUBLIC_SITE_ORIGIN;
 if(configured){if(configured!==STAGING_ORIGIN)throw Error('Unapproved staging website origin.');return configured;}
 return process.env.NODE_ENV==='development'?'http://127.0.0.1:3002':'https://mettelo.com';
}
export function publicRuntimeOrigin(){return process.env.NEXT_PUBLIC_SITE_ORIGIN===STAGING_ORIGIN?'':process.env.NODE_ENV==='development'?'http://127.0.0.1:3001':'';}
export function hostedStaging(){return process.env.NEXT_PUBLIC_SITE_ORIGIN===STAGING_ORIGIN;}
