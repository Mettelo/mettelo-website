import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeMemberPath} from '../lib/auth-navigation.mjs';
test('account redirects preserve supported member destinations',()=>{
  for(const path of ['/admin','/admin/projects','/admin/opportunities?review=1','/member','/member/profile?from=signup','/onboarding','/auth/update-password'])assert.equal(safeMemberPath(path),path);
});
test('account redirects reject external and unshipped destinations',()=>{
  for(const path of [null,'https://evil.test','//evil.test','/\\evil.test','/member/../../outside','/administrator','/projects/abc','/member\n','/%2f%2fevil.test'])assert.equal(safeMemberPath(path),'/member');
});
