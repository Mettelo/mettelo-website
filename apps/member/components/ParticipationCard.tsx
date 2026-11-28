import AppIcon from '@/components/AppIcon';
import type {ReactNode} from 'react';
type Props={reference:string;title:string;label:string;status:string;tone?:'neutral'|'active'|'attention';children:ReactNode};
export default function ParticipationCard({reference,title,label,status,tone='neutral',children}:Props){return <article className="pcCard"><header className="pcCardHeader"><span className="pcProjectIcon" aria-hidden="true"><AppIcon name="clipboard"/></span><span className="pcStatus" data-tone={tone}><span aria-hidden="true"/>{status}</span></header><div className="pcProjectTitle"><p className="pcOverline">{label}</p><h2>{title}</h2><p className="pcReference">{reference}</p></div>{children}</article>;}
