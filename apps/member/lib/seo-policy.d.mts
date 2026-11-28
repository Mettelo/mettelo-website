export function publicIndexingEnabled(env?:NodeJS.ProcessEnv):boolean;
export function publicRobots(env?:NodeJS.ProcessEnv):{index:boolean;follow:boolean};
export function indexingHeaders(env?:NodeJS.ProcessEnv):{source:string;headers:{key:string;value:string}[]}[];
