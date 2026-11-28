import {mkdir,open,readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {validatePreparedBatch} from './runner-contract.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function paths(root,id){validatePreparedBatch({runId:id,candidates:[]});return {batch:resolve(root,`${id}.json`),receipt:resolve(root,`${id}.receipt.json`)};}
export async function savePreparedBatch(root,batch){
 validatePreparedBatch(batch);await mkdir(root,{recursive:true});
 const file=await open(paths(root,batch.runId).batch,'wx',0o600);
 try{await file.writeFile(JSON.stringify({version:1,sha256:hash(batch),batch},null,2));}finally{await file.close();}
 return {runId:batch.runId,candidates:batch.candidates.length,sha256:hash(batch)};
}
export async function loadPreparedBatch(root,id){
 const record=JSON.parse(await readFile(paths(root,id).batch,'utf8'));
 validatePreparedBatch(record.batch);
 if(record.version!==1||record.batch.runId!==id||record.sha256!==hash(record.batch))throw new Error('Prepared batch integrity check failed. Do not publish it.');
 return record.batch;
}
export async function saveRunReceipt(root,id,receipt){
 const destination=`${paths(root,id).receipt}.${randomUUID()}.json`;await mkdir(root,{recursive:true});
 const file=await open(destination,'wx',0o600);
 try{await file.writeFile(JSON.stringify({runId:id,recordedAt:new Date().toISOString(),...receipt},null,2));}finally{await file.close();}
 return destination;
}
