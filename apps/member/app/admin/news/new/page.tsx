import {randomUUID} from 'node:crypto';
import {newsAdmin,type EditorialArticle} from '@/lib/news-server';
import {adminCapabilities} from '@/lib/admin-capabilities';
import {emptyArticle} from '@/lib/news.mjs';
import NewsEditor from '@/components/news/NewsEditor';
import '@/app/industry-news/news.css';
export default async function Page(){await newsAdmin();const c=await adminCapabilities();const article:EditorialArticle={can_publish:c?.publish===true,id:randomUUID(),slug:'',draft:{...emptyArticle},published:null,status:'draft',revision:0,first_published_at:null,published_at:null,updated_at:new Date().toISOString()};return <NewsEditor initial={article}/>;}
