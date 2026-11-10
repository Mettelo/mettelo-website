export type WorkspaceItem={milestone_accepted_at?:string|null;id:string;kind:string;title:string;body:string;url:string|null;status:string;owner_id:string|null;author_id:string;collaboration:string;created_at:string};
export type WorkspaceMember={id:string;name:string;role:string;username?:string|null;headline?:string|null};
export const taskLabels:Record<string,string>={todo:'To do',in_progress:'In progress',blocked:'Blocked',ready_for_review:'Ready for review',review:'Ready for review',done:'Done'};
export function taskLabel(status:string){return taskLabels[status]||status.replaceAll('_',' ');}
