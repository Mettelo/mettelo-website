import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveHostedReferences} from '../scripts/hosted-static-html.mjs';
test('contact assets resolve inside their directory with and without a trailing slash',()=>{
 const html=resolveHostedReferences(fs.readFileSync(new URL('../contact/index.html',import.meta.url),'utf8'),'contact/index.html');
 const script=html.match(/<script[^>]+src="([^"]*contact\.js)"/)?.[1];
 const css=html.match(/<link[^>]+href="([^"]*contact\.css)"/)?.[1];
 assert.ok(script&&css);
 for(const route of ['/contact','/contact/']){
  assert.equal(new URL(script,'https://example.invalid'+route).pathname,'/contact/contact.js');
  assert.equal(new URL(css,'https://example.invalid'+route).pathname,'/contact/contact.css');
 }
});
test('hosted Start, About, guidelines and contact keep their assets at the correct directory URLs',()=>{
 for(const dir of ['start','our-story','community-guidelines','contact']){
  const html=fs.readFileSync(new URL('../'+dir+'/index.html',import.meta.url),'utf8'),prepared=resolveHostedReferences(html,dir+'/index.html');
  for(const match of html.matchAll(/\b(?:src|href|poster)="([^"]+)"/gi)){
   const original=match[1];if(/^[\/#?]|^[a-z][a-z0-9+.-]*:/i.test(original))continue;
   const expected=new URL(original,'https://example.invalid/'+dir+'/index.html');
   assert.ok(prepared.includes('="'+expected.pathname+expected.search+expected.hash+'"'),original+' was not resolved');
  }
 }
 const html='<a href="#step">Step</a><a href="https://example.test/x">External</a><img src="../assets/photo.png"><script src="page.js?x=1"></script>';
 assert.equal(resolveHostedReferences(html,'start/index.html'),'<a href="#step">Step</a><a href="https://example.test/x">External</a><img src="/assets/photo.png"><script src="/start/page.js?x=1"></script>');
});
