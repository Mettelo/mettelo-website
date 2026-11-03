import type {NextConfig} from 'next';
const config:NextConfig={
  // Keep a production verification build separate from the running local app.
  distDir:process.env.METTELO_BUILD_CHECK==='1'?'.next-check':process.env.METTELO_ISOLATED_PREVIEW==='1'?'.next-preview':'.next',
  outputFileTracingRoot:process.cwd(),
  devIndicators:false,
  skipMiddlewareUrlNormalize:true,
  async headers(){return [{source:'/:path*',headers:[
    {key:'Cache-Control',value:'private, no-store, max-age=0'},
    {key:'X-Robots-Tag',value:'noindex, nofollow'},
    {key:'Referrer-Policy',value:'same-origin'}
  ]}];}
};
export default config;
