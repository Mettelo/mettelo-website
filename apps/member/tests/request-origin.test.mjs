import test from 'node:test';
import assert from 'node:assert/strict';
import {memberOrigin} from '../lib/request-origin.mjs';
test('redirects and origin checks use only the approved configured origin', () => {
  const previous = process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN;
  try {
    for (const value of ['', 'https://example.com', 'http://localhost:3001', 'http://127.0.0.1:3001/evil', 'http://127.0.0.1:3001/?next=evil']) {
      process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN = value;
      assert.throws(() => memberOrigin());
    }
    process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN = 'http://127.0.0.1:3001';
    assert.equal(memberOrigin(), 'http://127.0.0.1:3001');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN;
    else process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN = previous;
  }
});

test('isolated preview origin requires both development mode and explicit preview activation',async()=>{
 const {profileRequestOriginAllowed}=await import('../lib/request-origin.mjs');
 const original={mode:process.env.NODE_ENV,preview:process.env.METTELO_ISOLATED_PREVIEW,origin:process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN};
 try{
  process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN='http://127.0.0.1:3001';process.env.NODE_ENV='development';delete process.env.METTELO_ISOLATED_PREVIEW;
  assert.equal(profileRequestOriginAllowed('http://127.0.0.1:3004'),false);
  process.env.METTELO_ISOLATED_PREVIEW='1';assert.equal(profileRequestOriginAllowed('http://127.0.0.1:3004'),true);
  assert.equal(profileRequestOriginAllowed('http://127.0.0.1:3005'),false);assert.equal(profileRequestOriginAllowed('http://localhost:3004'),false);
  process.env.NODE_ENV='production';assert.equal(profileRequestOriginAllowed('http://127.0.0.1:3004'),false);
 }finally{
  for(const [key,value] of [['NODE_ENV',original.mode],['METTELO_ISOLATED_PREVIEW',original.preview],['NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN',original.origin]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});

test('profile preview origin is allowed only in local development',async()=>{
 const {profileRequestOriginAllowed}=await import('../lib/request-origin.mjs');
 const previous=process.env.NODE_ENV,origin=process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN;
 try{process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN='http://127.0.0.1:3001';process.env.NODE_ENV='development';assert.equal(profileRequestOriginAllowed('http://127.0.0.1:3003'),true);assert.equal(profileRequestOriginAllowed('https://example.com'),false);assert.equal(profileRequestOriginAllowed(null),false);process.env.NODE_ENV='production';assert.equal(profileRequestOriginAllowed('http://127.0.0.1:3003'),false);assert.equal(profileRequestOriginAllowed('http://127.0.0.1:3001'),true);}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;if(origin===undefined)delete process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN;else process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN=origin;}
});

test('page navigation stays on the isolated preview without changing email callback origin',async()=>{
 const {memberInterfaceOrigin}=await import('../lib/request-origin.mjs');
 const original={mode:process.env.NODE_ENV,preview:process.env.METTELO_ISOLATED_PREVIEW,origin:process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN};
 try{
 process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN='http://127.0.0.1:3001';process.env.NODE_ENV='development';process.env.METTELO_ISOLATED_PREVIEW='1';
 assert.equal(memberInterfaceOrigin(),'http://127.0.0.1:3004');assert.equal(memberOrigin(),'http://127.0.0.1:3001');
 delete process.env.METTELO_ISOLATED_PREVIEW;assert.equal(memberInterfaceOrigin(),'http://127.0.0.1:3001');
 process.env.METTELO_ISOLATED_PREVIEW='1';process.env.NODE_ENV='production';assert.equal(memberInterfaceOrigin(),'http://127.0.0.1:3001');
 }finally{for(const [key,value] of [['NODE_ENV',original.mode],['METTELO_ISOLATED_PREVIEW',original.preview],['NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN',original.origin]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
