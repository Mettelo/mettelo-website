// Public HTML is served through slash-normalised application routes. Resolve
// local references against its source document, not the browser's rewritten URL.
export function resolveHostedReferences(html,documentPath){
 const base=new URL(documentPath,'https://hosted.invalid/');
 return html.replace(/\b(src|href|poster)="([^"]+)"/gi,(original,attribute,value)=>{
  if(/^[\/#?]|^[a-z][a-z0-9+.-]*:/i.test(value))return original;
  const target=new URL(value,base);
  return attribute+'="'+target.pathname+target.search+target.hash+'"';
 });
}
