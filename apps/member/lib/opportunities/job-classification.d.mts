export const TAXONOMY_VERSION:string;
export const jobCategories:{id:string;label:string}[];
export const discoveryTerms:string[];
export function normaliseJobText(value:unknown):string;
export function detectSeniority(title:string):string;
export type JobClassification={version:string;score:number;status:'high'|'medium'|'low';confidence:string;scoreType:string;semanticModelUsed:boolean;roleFamily:string;canonicalTitle:string|null;occupationIds:string[];primaryCategory:string|null;categories:string[];seniority:string;industries:string[];skills:string[];responsibilities:string[];reasons:string[];eligible:boolean;duplicateReview?:boolean};
export function classifyJob(title:string,description?:string,context?:{provider?:string;organisation?:string;sourceOrganisation?:string}):JobClassification;
export function discoveryPlan(options?:{at?:number;limit?:number}):{terms:string[];coverageNote:string};
