export function feedReadQuery(query:URLSearchParams):{action:string;payload:Record<string,string>};
export function appendFeedPage<T extends {id:string}>(current:T[],next:T[]):T[];
export function feedSnapshotSeed(posts:unknown[]):string;
export function refreshFeedPage<T extends {id:string;created_at:string}>(current:T[],fresh:T[]):T[];
