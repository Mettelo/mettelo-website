export function feedReadQuery(query:URLSearchParams):{action:string;payload:Record<string,string>};
export function appendFeedPage<T extends {id:string}>(current:T[],next:T[]):T[];
