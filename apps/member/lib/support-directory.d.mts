export type SupportFilters={filter:string;source:string;ownership:string;topic:string;q:string;page:number};
export function supportFilters(query?:Record<string,string|undefined>):SupportFilters;
export function supportHref(filters:SupportFilters,patch?:Partial<SupportFilters>):string;
