import type {MetadataRoute} from 'next';
import {publicIndexingEnabled} from '@/lib/seo-policy.mjs';
export default function robots():MetadataRoute.Robots{return {rules:publicIndexingEnabled()?{userAgent:'*',allow:['/industry-news','/opportunities'],disallow:['/admin/','/member/','/api/','/auth/','/signin','/signup']}:{userAgent:'*',disallow:'/'},sitemap:'https://mettelo.com/sitemap.xml'};}
