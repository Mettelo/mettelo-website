export type DirectoryFilters={section:string;status:string;arrangement:string;review:string;project:string;q:string;page:number};
export function projectDirectoryFilters(input?:Record<string,unknown>):DirectoryFilters;
export function projectDirectoryHref(filters:DirectoryFilters,changes?:Record<string,unknown>):string;
