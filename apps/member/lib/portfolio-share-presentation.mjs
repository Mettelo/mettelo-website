import {portfolioEvidenceUrl} from './member-portfolio.mjs';
export function portfolioShareDefaults(record,authorName='Member'){
 return {title:record.title.slice(0,180),summary:record.body.slice(0,2000),author_display:authorName.slice(0,80),project_context:'',skills:record.skills.slice(0,8).join(', '),individual_part:'',include_evidence:false,evidence_url:record.url||''};
}
export function portfolioSharePayload(record,fields,nonce,confirmed=false){
 if(!confirmed)throw Error('Preview and confirm the public summary first.');
 if(fields.title.trim().length<5||fields.title.length>180)throw Error('Use a title of 5–180 characters.');
 if(fields.summary.trim().length<20||fields.summary.length>2000)throw Error('Add a little more detail about your work: at least 20 characters.');
 if(fields.author_display.trim().length<2||fields.author_display.length>80)throw Error('Add the name you want to display.');
 if(fields.project_context.length>180)throw Error('Keep the public project context within 180 characters.');
 if(record.kind==='delivery'&&fields.individual_part.trim().length<20)throw Error('Explain your own part in this team delivery: at least 20 characters.');
 if(fields.individual_part.length>1000)throw Error('Keep your individual part within 1,000 characters.');
 const skills=fields.skills.split(',').map(s=>s.trim()).filter(Boolean);
 if(skills.length>8||skills.some(s=>s.length<2||s.length>40))throw Error('Choose up to eight skills, each 2–40 characters.');
 const evidence=fields.include_evidence?portfolioEvidenceUrl(fields.evidence_url):null;
 if(fields.include_evidence&&(!evidence||evidence.length>1000))throw Error('Use a public HTTPS evidence link without credentials.');
 return {action:'create',kind:record.kind,source_id:record.id,client_nonce:nonce,title:fields.title,summary:fields.summary,author_display:fields.author_display,project_context:fields.project_context,skills:fields.skills,individual_part:fields.individual_part,include_evidence:fields.include_evidence,evidence_url:evidence,approved_public:true};
}
export function portfolioSocialLinks(url,title){
 return {linkedin:'https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(url),x:'https://twitter.com/intent/tweet?url='+encodeURIComponent(url)+'&text='+encodeURIComponent(title),whatsapp:'https://wa.me/?text='+encodeURIComponent(title+' '+url)};
}
