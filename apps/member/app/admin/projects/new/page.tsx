import {randomUUID} from 'node:crypto';
import {adminCapabilities} from '@/lib/admin-capabilities';
import ProjectPublisher from './ProjectPublisher';
export const dynamic='force-dynamic';
export default async function Page(){const capabilities=await adminCapabilities();if(!capabilities?.operations)return <section className="section"><div className="shell"><h1>Project administrator access required</h1></div></section>;return <ProjectPublisher nonce={randomUUID()}/>;}
