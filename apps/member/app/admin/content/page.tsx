import {notFound} from 'next/navigation';
import {labSession} from '@/lib/lab';
import {contentAdmin,type ContentDocument} from '@/lib/site-content';
import ContentEditor from './ContentEditor';
import {adminCapabilities} from '@/lib/admin-capabilities';
import './content.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{key?:string}>}){const {key}=await searchParams;if(!key)notFound();const {db}=await labSession();let doc:ContentDocument;try{doc=await contentAdmin(db,'get',{key});}catch{return <section className="section"><h1>Content unavailable</h1><p>Your account may not have permission to edit this content.</p></section>;}const c=await adminCapabilities();return <ContentEditor canUpload={Boolean(c?.roles)} key={doc.key+doc.version} document={doc}/>;}
