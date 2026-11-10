import type {LabCard} from './lab';
export function placementJourney(card:LabCard):{solo:boolean;arrangement:string;offered:boolean;canEnter:boolean;pending:string[];status:string;note:string;arrangementNote:string;preferenceNote:string};
export function labReadOnlyMessage(options:{status:string;solo?:boolean;isMember?:boolean}):string;
