// Home summaries reuse the member's existing guarded workspace reads.
/** @typedef {import('./lab').LabCard} Card */
/** @typedef {import('./lab-workspace').WorkspaceItem} Item */
/** @typedef {{team_id:string,items:Item[],failed?:boolean}} ProgressWorkspace */
/** @param {Card[]} cards */
export function progressCards(cards){return [...new Map(cards.filter(c=>c.membership_status==='confirmed'&&c.can_enter===true&&c.lab_enabled===true&&['active','completed'].includes(c.team_status)).map(c=>[c.team_id,c])).values()];}
/**
 * @param {{cards?:Card[],workspaces?:ProgressWorkspace[],userId:string,labFailed?:boolean}} options
 */
export function memberProgress({cards=[],workspaces=[],userId,labFailed=false}){
 const eligible=progressCards(cards),active=eligible.filter(c=>c.team_status==='active');
 const missing=labFailed||eligible.some(c=>!workspaces.some(w=>w.team_id===c.team_id&&!w.failed));
 const rows=eligible.flatMap(card=>{const workspace=workspaces.find(w=>w.team_id===card.team_id&&!w.failed);return (workspace?.items||[]).map(item=>({card,item}));});
 const rank={in_progress:0,todo:1,blocked:2,ready_for_review:3};
 const tasks=rows.filter(({card,item})=>card.team_status==='active'&&item.kind==='task'&&item.owner_id===userId&&Object.hasOwn(rank,item.status)).sort((a,b)=>rank[a.item.status]-rank[b.item.status]||a.item.created_at.localeCompare(b.item.created_at)||a.item.id.localeCompare(b.item.id));
 const milestone=rows.find(({card,item})=>card.team_status==='active'&&item.kind==='milestone'&&item.owner_id===userId&&item.status!=='done');
 const next=tasks[0]||milestone||null;
 return {activeProjects:labFailed?null:new Set(active.map(c=>c.project_ref)).size,unavailable:missing,next};
}
