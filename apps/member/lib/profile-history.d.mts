export type HistoryKind='education_entries'|'experience_entries';
export type HistoryEntry=Record<string,string>;
export const historyFields:Record<HistoryKind,{key:string;label:string;max:number;placeholder?:string;multiline?:boolean}[]>;
export function validateHistory(value:unknown,kind:HistoryKind):HistoryEntry[];
