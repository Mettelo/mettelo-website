import SupportWorkspace from './SupportWorkspace';
import type {EnquirySummary} from '@/lib/lab-support';
export default function LabSupport({teamId,teamLabel,projectTitle,cases}:{teamId:string;teamLabel?:string;projectTitle?:string;cases:EnquirySummary[]}){return <SupportWorkspace embedded cases={cases} placements={[{team_id:teamId,title:projectTitle||'This project',label:teamLabel||'Your team'}]}/>;}
