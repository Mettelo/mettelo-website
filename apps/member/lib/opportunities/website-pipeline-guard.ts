export function requireWebsitePipelineWrite(){
 // Writes stay disabled until the website schema, credentials and run lock are verified.
 throw new Error('Website opportunity pipeline writes are not enabled. Use the discovery dry run.');
}
