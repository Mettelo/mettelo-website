'use client';
import {publicWebsiteOrigin,publicRuntimeOrigin} from '@/lib/site-origins.mjs';

import {useEffect,useRef} from 'react';
import template from './public-footer.snapshot.json';
import {setupPublicFooter} from './public-footer-behavior.mjs';
import './public-footer.css';
export default function PublicFooter(){
 const ref=useRef<HTMLDivElement>(null),website=publicWebsiteOrigin(),runtime=publicRuntimeOrigin();
 // Repository-owned template only. This footer never reads member/session data.
 let html=template.replaceAll('{{ASSETS}}',website+'/').replace(/href="(\/[^\"]*)"/g,(_,path)=>`href="${website}${path}"`).replace('>2026</span>',`>${new Date().getUTCFullYear()}</span>`);
 html=html.replace(/href="[^"]*" data-member-route="\/opportunities"/,`href="${runtime}/opportunities"`);
 useEffect(()=>setupPublicFooter(ref.current?.querySelector('footer')),[]);
 return <div ref={ref} dangerouslySetInnerHTML={{__html:html}}/>;
}
