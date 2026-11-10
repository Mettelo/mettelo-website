import {notFound} from 'next/navigation';
import Link from 'next/link';
import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import PortfolioProofCard from '@/components/PortfolioProofCard';
import {readSharedProof} from '@/lib/shared-portfolio';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{token:string}>}){const {token}=await params,proof=await readSharedProof(token);return {title:proof?proof.title+' | Mettelo Portfolio':'Shared summary unavailable',description:'A member-written summary of practical work. Not an independently verified credential.',robots:{index:false,follow:false},openGraph:{type:'article',title:proof?.title||'Mettelo Portfolio',description:'A member-written account of practical work, shared by choice.'}};}
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params,proof=await readSharedProof(token);if(!proof)notFound();return <section className="proofPublic"><span className="proofCategory">Mettelo · Shared portfolio summary</span><h1>Work, with its context.</h1><p>This member selected the text and any evidence link below for public sharing. Private Lab conversations, account details and the full Portfolio are not included.</p><PortfolioProofCard proof={proof}/><p>Sharing does not make this an independently verified Mettelo Proof award. A source milestone’s acceptance applies to its original record.</p><Link href={publicWebsiteOrigin()+'/start/'}>Explore Mettelo →</Link></section>;}
