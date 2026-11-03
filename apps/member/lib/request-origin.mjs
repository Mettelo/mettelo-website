// Use the configured app origin: Next's internal request URL can use localhost
// even when the browser uses 127.0.0.1. Never trust forwarded host headers here.
export function memberOrigin() {
  const value = process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN;
  if (!value) throw new Error('Member app origin is not configured.');
  const url = new URL(value);
  if (url.origin !== 'http://127.0.0.1:3001' || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('This staging slice requires the approved local app origin.');
  }
  return url.origin;
}

// The separate interface preview runs on 3003; email callbacks stay on 3001.
export function profileRequestOriginAllowed(origin){
 const configured=memberOrigin();
 return origin===configured||(process.env.NODE_ENV==='development'&&(origin==='http://127.0.0.1:3003'||(process.env.METTELO_ISOLATED_PREVIEW==='1'&&origin==='http://127.0.0.1:3004')));
}
