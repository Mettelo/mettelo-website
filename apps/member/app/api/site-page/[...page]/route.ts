import {GET as renderPage} from '../route';

export const dynamic='force-dynamic';

// Keep the same renderer, private-preview authorization and response policy as
// the direct endpoint. Route parameters survive hosted beforeFiles rewrites.
export async function GET(request:Request,context:{params:Promise<{page:string[]}>}){
 const {page}=await context.params;
 const url=new URL(request.url);
 url.searchParams.set('path','/'+page.join('/')+'/');
 return renderPage(new Request(url,request));
}
