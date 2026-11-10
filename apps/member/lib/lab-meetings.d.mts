export function safeMeetingUrl(value:string):string|null;
export function meetingInstant(local:string,timeZone:string):string;
export function normaliseMeeting(input:Record<string,unknown>,now?:number):{topic:string;agenda:string;join_url:string;starts_at:string;ends_at:string;time_zone:string};
export function meetingEmail(job:any):{subject:string;text:string;html:string;calendar:string;idempotencyKey:string};
