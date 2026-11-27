import test from 'node:test';
import assert from 'node:assert/strict';
import {existingLabJourney} from '../lib/existing-lab-journey.mjs';
const ready={membership_status:'confirmed',can_enter:true,lab_enabled:true,team_status:'active',legacy_source_status:'Confirmed'};
test('restored existing member enters reviewed Lab without a new application',()=>{assert.equal(existingLabJourney(ready).canEnter,true);});
test('pending acknowledgement never becomes an offer or entry button',()=>{const view=existingLabJourney({...ready,membership_status:'pending',legacy_source_status:'Awaiting acknowledgement'});assert.equal(view.canEnter,false);assert.match(view.status,/acknowledgement/);assert.match(view.message,/new project application is not needed/);});
test('review conflict and missing entry check cannot expose workspace access',()=>{assert.equal(existingLabJourney({...ready,legacy_review:'placement_conflict'}).canEnter,false);assert.equal(existingLabJourney({...ready,can_enter:false}).canEnter,false);assert.equal(existingLabJourney({...ready,lab_enabled:false}).canEnter,false);});
test('paused and preparing records keep their distinct next steps',()=>{assert.equal(existingLabJourney({...ready,team_status:'paused'}).status,'Lab paused');assert.match(existingLabJourney({...ready,team_status:'forming'}).status,/preparing/);});
test('completed existing Lab opens as read-only history',()=>{const view=existingLabJourney({...ready,team_status:'completed'});assert.equal(view.canEnter,true);assert.match(view.message,/read-only/);});
