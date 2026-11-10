import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {memberSupabaseConfiguration} from './supabase/config';
import {labSession} from './lab';
export type ArticleDocument={title:string;excerpt:string;body:string;author:string;category:string;format:string;cover_url:string;cover_alt:string;source_name:string;source_url:string};
export type PublishedArticle=ArticleDocument&{slug:string;published_at:string;first_published_at?:string;reading_minutes?:number};
export type EditorialArticle={can_publish?:boolean;id:string;slug:string;draft:ArticleDocument;published:ArticleDocument|null;status:'draft'|'published';revision:number;first_published_at:string|null;published_at:string|null;updated_at:string};
export async function publicNews(slug:string|null=null,query:Record<string,string>={}){
 const {url,key}=memberSupabaseConfiguration();
 // Always anonymous, even for a signed-in administrator. No draft/session leakage.
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('website_news_public',{p_slug:slug,p_query:query});if(error)throw Error('Industry News could not be loaded. Please try again shortly.');return data;
}
export async function newsAdmin(){const {db,user}=await labSession();if(!user)throw Error('Verified sign-in required.');const {data,error}=await db.rpc('website_news_admin',{p_action:'access'});if(error||data?.allowed!==true)throw Error('News administrator access required.');return db;}
export async function editorialArticle(id:string){const db=await newsAdmin();const {data,error}=await db.rpc('website_news_admin',{p_action:'get',p_payload:{id}});if(error)throw error;return data as EditorialArticle;}
