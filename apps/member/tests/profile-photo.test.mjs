import test from 'node:test';
import assert from 'node:assert/strict';
import {profilePhotoFileError,profilePhotoStorageFailure,profilePhotoLimit} from '../lib/profile-photo.mjs';
test('photo validation permits supported files through the exact 5MB boundary and rejects invalid selections',()=>{
 for(const type of ['image/jpeg','image/png','image/webp'])assert.equal(profilePhotoFileError({type,size:profilePhotoLimit}),'');
 assert.match(profilePhotoFileError(null),/Choose a photo/);
 assert.match(profilePhotoFileError({type:'image/svg+xml',size:100}),/JPG, PNG or WebP/);
 assert.match(profilePhotoFileError({type:'image/png',size:0}),/empty/);
 assert.match(profilePhotoFileError({type:'image/png',size:profilePhotoLimit+1}),/5 MB/);
});
test('photo failures distinguish access, size, rate limit and temporary outage without exposing provider secrets',()=>{
 for(const status of [401,403])assert.equal(profilePhotoStorageFailure({statusCode:String(status)}).status,403);
 assert.equal(profilePhotoStorageFailure({status:413}).status,413);
 assert.equal(profilePhotoStorageFailure({statusCode:429}).status,429);
 const failure=profilePhotoStorageFailure({statusCode:500,message:'private-provider-details'});
 assert.equal(failure.status,503);assert.match(failure.message,/existing photo has not changed/);assert.doesNotMatch(failure.message,/private-provider/);
});
