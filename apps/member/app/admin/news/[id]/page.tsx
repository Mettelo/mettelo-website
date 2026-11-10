import {notFound} from 'next/navigation';
import {editorialArticle} from '@/lib/news-server';
import NewsEditor from '@/components/news/NewsEditor';
import '@/app/industry-news/news.css';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();let article;try{article=await editorialArticle(id);}catch(error){if((error as {code?:string}).code==='P0002')notFound();throw error;}return <NewsEditor key={article.id} initial={article}/>;}
