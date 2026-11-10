import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeOpportunityLink} from '../lib/opportunity-links.mjs';
test('external application links require HTTPS and reject credentials and executable URLs',()=>{
 assert.equal(safeOpportunityLink('https://example.com/jobs?q=data'),'https://example.com/jobs?q=data');
 for(const value of [null,'','javascript:alert(1)','data:text/html,x','http://example.com','https://user:password@example.com','/signin'])assert.equal(safeOpportunityLink(value),null);
});
