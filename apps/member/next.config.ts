import {readFileSync} from 'node:fs';
import type {NextConfig} from 'next';
import {indexingHeaders} from './lib/seo-policy.mjs';
const config:NextConfig={
  // Keep a production verification build separate from the running local app.
  distDir:process.env.METTELO_STAGING_CHECK==='1'?'.next-staging-check':process.env.METTELO_BUILD_CHECK==='1'?'.next-check':process.env.METTELO_ISOLATED_PREVIEW==='1'?'.next-preview':'.next',
  outputFileTracingRoot:process.cwd(),
  output:process.env.NEXT_PUBLIC_SITE_ORIGIN==='https://staging.mettelo.com'?'standalone':undefined,
  async rewrites(){return {beforeFiles:process.env.NEXT_PUBLIC_SITE_ORIGIN==='https://staging.mettelo.com'?JSON.parse(readFileSync('hosted-static-routes.json','utf8')):[],afterFiles:[],fallback:[]};},
  devIndicators:false,
  skipMiddlewareUrlNormalize:true,
  async headers(){return indexingHeaders();}
};
export default config;
