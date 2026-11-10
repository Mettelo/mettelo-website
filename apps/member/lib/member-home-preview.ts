import {exampleLabCards,exampleApplications} from './participation-preview';
import type {WorkspaceItem} from './lab-workspace';
import {progressCards} from './member-progress.mjs';
// Development-only presentation fixtures. All example actions are disabled.
export function memberHomePreview(name:string|undefined){
 const active={...exampleLabCards[0],commitment_confirmed:true,can_enter:true};
 const base={cards:[] as typeof exampleLabCards,applications:[] as typeof exampleApplications,applicationCount:0,profilePercent:80,labFailed:false,applicationsFailed:false};
 switch(name){
 case 'active':return {...base,cards:[active]};
 case 'progress':return {...base,cards:[active,{...exampleLabCards[2],team_status:'active',can_enter:true},exampleLabCards[3]],applications:exampleApplications.slice(1,2),applicationCount:1};
 case 'offer':return {...base,cards:[{...exampleLabCards[1],offer_expires_at:new Date(Date.now()+2*86400000).toISOString()},active]};
 case 'responsibility':return {...base,cards:[{...active,is_nominee:true,coordinator_agreed:false}]};
 case 'forming':return {...base,cards:[exampleLabCards[2]]};
 case 'completed':return {...base,cards:[exampleLabCards[3]]};
 case 'applied':return {...base,applications:exampleApplications.slice(0,2),applicationCount:2};
 case 'profile':return {...base,profilePercent:50};
 case 'unavailable':return {...base,labFailed:true};
 default:return null;
 }
}
// Synthetic records for development examples only, never merged into real activity.
export function exampleProgressWorkspaces(cards:typeof exampleLabCards){return progressCards(cards).map(card=>({team_id:card.team_id,items:[
 ...Array.from({length:2},(_,i)=>({id:`example-approved-${card.team_id}-${i}`,kind:'task',title:'Example reviewed task',status:'done',owner_id:'example-member',author_id:'example-member'})),
 {id:`example-proof-${card.team_id}`,kind:'contribution',title:'Example repository contribution',status:'todo',owner_id:'example-member',author_id:'example-member'},
 {id:`example-next-${card.team_id}`,kind:'task',title:'Build and test the first working prototype',status:'in_progress',owner_id:'example-member',author_id:'example-member'}
 ].map(item=>({...item,body:'Explicitly synthetic example',url:null,collaboration:'',created_at:'2026-11-04T09:00:00Z'} as WorkspaceItem))}));}
