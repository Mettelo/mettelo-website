import test from 'node:test';
import assert from 'node:assert/strict';
import {connectSystemCopy,collaborationActionNotice} from '../lib/connect-copy.mjs';
test('legacy saved system notices use Connect while member-authored text and routes remain intact',()=>{
 assert.equal(connectSystemCopy('Market update saved.'),'Connect update saved.');
 assert.equal(connectSystemCopy('A new reply to your Market post'),'A new reply to your Connect post');
 assert.equal(connectSystemCopy('You were mentioned in Lab Market'),'You were mentioned in Mettelo Connect');
 for(const text of ['My project studies the job market.','Our Lab Market research findings','/member/market?tab=requests'])assert.equal(connectSystemCopy(text),text);
});
test('collaboration confirmations describe the saved action rather than a generic Market update',()=>{
 for(const action of ['preferences','capacity','recruitment','request','invite','decline','withdraw','accept','remove'])assert.doesNotMatch(collaborationActionNotice(action),/\bMarket\b/);
 assert.match(collaborationActionNotice('decline'),/declined/);assert.match(collaborationActionNotice('withdraw'),/withdrawn/);assert.match(collaborationActionNotice('invite'),/invitation sent/);
});
