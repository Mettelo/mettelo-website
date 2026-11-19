import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolioShareDefaults,portfolioSharePayload,portfolioSocialLinks} from '../lib/portfolio-share-presentation.mjs';
const record={id:'source',kind:'contribution',title:'A contribution title',body:'I built and documented a reproducible reporting pipeline.',skills:['SQL'],url:'https://private.example.test/repository',project_title:'Private project',team_id:'private-team',collaboration:'Private working notes'};
test('sharing starts from selected work and display name, without copying private context or evidence',()=>{
 const fields=portfolioShareDefaults(record,'Alex Taylor');assert.equal(fields.author_display,'Alex Taylor');assert.equal(fields.project_context,'');assert.equal(fields.include_evidence,false);assert.equal(fields.individual_part,'');
 const payload=portfolioSharePayload(record,fields,'stable-nonce',true);assert.equal(payload.evidence_url,null);assert.equal(payload.team_id,undefined);assert.equal(payload.collaboration,undefined);assert.equal(payload.project_title,undefined);assert.equal(payload.source_id,'source');assert.equal(payload.client_nonce,'stable-nonce');
});
test('an explicit confirmation is required before building a public create request',()=>{
 assert.throws(()=>portfolioSharePayload(record,portfolioShareDefaults(record),'nonce'),/confirm/);
 assert.equal(portfolioSharePayload(record,portfolioShareDefaults(record),'nonce',true).approved_public,true);
});
test('missing details are explained rather than invented, especially individual team-delivery work',()=>{
 const fields=portfolioShareDefaults(record);assert.throws(()=>portfolioSharePayload(record,{...fields,summary:'Too short'},'nonce',true),/20 characters/);
 assert.throws(()=>portfolioSharePayload({...record,kind:'delivery'},fields,'nonce',true),/your own part/);
 assert.equal(portfolioSharePayload({...record,kind:'delivery'},{...fields,individual_part:'I built the data pipeline and wrote its reproducible tests.'},'nonce',true).kind,'delivery');
});
test('evidence is an explicit opt-in and unsafe public links are rejected',()=>{
 const fields={...portfolioShareDefaults(record),include_evidence:true};
 for(const evidence_url of ['javascript:alert(1)','http://example.test','https://user:password@example.test'])assert.throws(()=>portfolioSharePayload(record,{...fields,evidence_url},'nonce',true),/HTTPS/);
 assert.equal(portfolioSharePayload(record,{...fields,evidence_url:'https://github.com/example/public'},'nonce',true).evidence_url,'https://github.com/example/public');
});
test('social URLs encode the approved public URL and title',()=>{
 const url='https://staging.mettelo.com/proof/example?x=1&y=2',links=portfolioSocialLinks(url,'A & B');assert.equal(new URL(links.linkedin).searchParams.get('url'),url);assert.equal(new URL(links.x).searchParams.get('text'),'A & B');assert.equal(new URL(links.whatsapp).searchParams.get('text'),'A & B '+url);
});
