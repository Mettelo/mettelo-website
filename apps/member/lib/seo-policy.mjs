// Explicit release gates. Local/staging remain noindex by default.
export function publicIndexingEnabled(env=process.env){return env.NEXT_PUBLIC_SITE_ORIGIN!=='https://staging.mettelo.com'&&env.METTELO_PUBLIC_INDEXING_ENABLED==='true'&&env.METTELO_PUBLIC_SITE_ORIGIN==='https://mettelo.com';}
export function publicRobots(env=process.env){const enabled=publicIndexingEnabled(env);return {index:enabled,follow:enabled};}
export function indexingHeaders(env=process.env){
 const rules=[{source:'/:path*',headers:[{key:'Cache-Control',value:'private, no-store, max-age=0'},{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Referrer-Policy',value:'same-origin'}]}];
 if(publicIndexingEnabled(env))for(const source of ['/industry-news/:path*','/opportunities'])rules.push({source,headers:[{key:'X-Robots-Tag',value:'index, follow'}]});
 return rules;
}
