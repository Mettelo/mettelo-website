import {test} from 'node:test';
import assert from 'node:assert/strict';
import {opportunitySourceGroup} from '../lib/opportunity-source-group.mjs';
test('source groups use pipeline provenance instead of employer names',()=>{
 assert.equal(opportunitySourceGroup('NHS Jobs'),'nhs');
 for(const source of ['CPS Careers · Civil Service','DWP Digital · Civil Service Jobs','HMRC · Civil Service','Home Office Civil Service recruitment'])assert.equal(opportunitySourceGroup(source),'civilservice');
 for(const source of [null,'Arbeitnow','Remotive','NHS vendor'])assert.equal(opportunitySourceGroup(source),'other');
});
