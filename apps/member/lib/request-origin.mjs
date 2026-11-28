// Use the configured app origin: Next's internal request URL can use localhost
// even when the browser uses 127.0.0.1. Never trust forwarded host headers here.
export function memberOrigin() {
  const value = process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN;
  if (!value) throw new Error('Member app origin is not configured.');
  const url = new URL(value);
  const hosted=url.origin==='https://staging.mettelo.com'&&process.env.NEXT_PUBLIC_SITE_ORIGIN==='https://staging.mettelo.com'&&process.env.METTELO_MEMBER_ENVIRONMENT==='staging';
  if ((!hosted&&url.origin !== 'http://127.0.0.1:3001') || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('This staging slice requires an approved app origin.');
  }
  return url.origin;
}

// The separate interface preview runs on 3003; email callbacks stay on 3001.
export function profileRequestOriginAllowed(origin){
 const configured=memberOrigin();
 return origin===configured||(process.env.NODE_ENV==='development'&&(origin==='http://127.0.0.1:3003'||(process.env.METTELO_ISOLATED_PREVIEW==='1'&&origin==='http://127.0.0.1:3004')));
}

// Page navigation stays in the isolated preview. Email callbacks remain unchanged.
export function memberInterfaceOrigin(){
 const configured=memberOrigin();
 return process.env.NODE_ENV==='development'&&process.env.METTELO_ISOLATED_PREVIEW==='1'?'http://127.0.0.1:3004':configured;
}
