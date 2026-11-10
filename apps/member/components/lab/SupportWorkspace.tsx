'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import './support-v2.css';
import LabActionForm from './LabActionForm';
import {enquiryStatus,reasonLabel,supportReasons,generalSupportReasons,type EnquirySummary} from '@/lib/lab-support';
type Placement={team_id:string;title:string;label:string};
export default function SupportWorkspace({cases,placements,embedded=false}:{cases:EnquirySummary[];placements:Placement[];embedded?:boolean}){
 const router=useRouter(),dialog=useRef<HTMLDialogElement>(null);
 const [page,setPage]=useState(1);const [filter,setFilter]=useState(cases.some(c=>c.status==='waiting_for_member')?'reply':'open'),[search,setSearch]=useState(''),[notice,setNotice]=useState(''),[reason,setReason]=useState('');
 const [context,setContext]=useState(embedded&&placements.length?'project':'general');
 const project=context==='project',topics=project?supportReasons:generalSupportReasons;
 const open=cases.filter(c=>!['resolved','closed'].includes(c.status)),closed=cases.filter(c=>['resolved','closed'].includes(c.status));
 useEffect(()=>setPage(1),[filter,search]);
 const reply=cases.filter(c=>c.status==='waiting_for_member');
 const rows=(filter==='reply'?reply:filter==='open'?open:filter==='closed'?closed:cases).filter(c=>`${c.subject} ${c.project_ref||''} ${c.team_label||''}`.toLowerCase().includes(search.toLowerCase()));
 const openForm=()=>dialog.current?.showModal();
 const newButton=<button type="button" className="lxButton primary" onClick={openForm}><span aria-hidden="true">＋</span> New enquiry</button>;
 return <div className="lx supportWorkspaceV2">
  <header className="lxHeader"><div><span className="lxKicker">Private support</span>{embedded?<h2>Get help. Keep moving.</h2>:<h1>My enquiries</h1>}<p>{embedded?'Ask Mettelo about your project, team or access. Follow the conversation here.':'Ask about your account, applications or project. Follow replies in one place.'}</p></div>{newButton}</header>
  {notice&&<div className="lxSuccess" role="status">✓ {notice}</div>}
  <div className="lxSupportLayout"><section aria-label="Your enquiries">
   <div className="lxToolbar"><div className="lxTabs" aria-label="Filter enquiries">{[['reply',`Reply needed (${reply.length})`],['open',`Open (${open.length})`],['closed','Resolved & closed'],['all','All']].map(([v,label])=><button key={v} aria-pressed={filter===v} onClick={()=>setFilter(v)}>{label}</button>)}</div></div>
   {<label className="lxSearch">Find an enquiry<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Subject or project"/></label>}
   <div className="lxEnquiryList">{rows.slice((page-1)*25,page*25).map(c=>{const s=enquiryStatus[c.status]||enquiryStatus.new;return <Link className="lxEnquiryRow" key={c.id} href={`/member/enquiries/${c.id}`}><div><span className="lxBadge" data-tone={s.tone}>{s.label}</span><h3>{c.subject}</h3><p>{c.team_id?`${c.project_ref} · ${c.team_label}`:'General member enquiry'}</p><span className="lxMeta">{reasonLabel(c.category)} · {new Date(c.updated_at||c.created_at).toLocaleDateString('en-GB')} · #{c.id.slice(0,8).toUpperCase()}</span></div><span className="supportNextAction">{c.status==='waiting_for_member'?'Reply now':'Open conversation'} →</span></Link>;})}</div>
   {rows.length>25&&<nav className="supportPages" aria-label="My enquiry pages">{page>1&&<button onClick={()=>setPage(p=>p-1)}>← Previous</button>}<span>Page {page} of {Math.ceil(rows.length/25)}</span>{page*25<rows.length&&<button onClick={()=>setPage(p=>p+1)}>Next 25 →</button>}</nav>}{!rows.length&&<div className="lxEmpty"><div className="lxMark" aria-hidden="true">?</div><h2>{search?'No matching enquiries.':filter==='reply'?'No reply needed right now.':filter==='open'?'Nothing waiting here.':'No enquiries in this view.'}</h2><p>{search?'Try another subject or project name.':'Need a hand? Send an enquiry and follow your conversation here.'}</p>{!search&&newButton}</div>}
  </section><aside className="lxSupportAside"><span className="lxKicker">Mettelo is here to help</span><h3>A question or a blocker?</h3><p>Ask about your account, an application, the website or your project. You can contact us before joining a team.</p><div className="lxPrivacy"><span aria-hidden="true">◇</span><span>Private to you and authorised Mettelo support staff. Your team and coordinator do not receive a copy.</span></div></aside></div>
  <dialog ref={dialog} className="lxDialog memberEnquiryDialog" aria-labelledby="new-enquiry-title"><div className="lxDialogInner"><header className="lxDialogHeader"><div><span className="lxKicker">A conversation with Mettelo</span><h2 id="new-enquiry-title">How can we help?</h2></div><button type="button" className="lxClose" aria-label="Close enquiry form" onClick={()=>dialog.current?.close()}>×</button></header>
   <LabActionForm action="support_create" successMessage="Your enquiry has been sent." onSaved={result=>{dialog.current?.close();setNotice('Enquiry sent. You can follow replies in My enquiries.');setFilter('open');setReason('');if(result?.case_id)router.push(`/member/enquiries/${result.case_id}`);}}>
    <label>What is your enquiry about?<select value={context} onChange={e=>{setContext(e.target.value);setReason('');}}><option value="general">General help</option>{placements.length>0&&<option value="project">Project help</option>}</select></label>
    {project?(placements.length===1?<><input type="hidden" name="team_id" value={placements[0].team_id}/><p className="lxMeta">{placements[0].title} · {placements[0].label}</p></>:<label>Which placement is this about?<select name="team_id" required defaultValue=""><option value="" disabled>Select a project team</option>{placements.map(p=><option key={p.team_id} value={p.team_id}>{p.title} · {p.label}</option>)}</select></label>):<input type="hidden" name="team_id" value=""/>}
    <label>What do you need help with?<select name="category" required value={reason} onChange={e=>setReason(e.target.value)}><option value="" disabled>Choose a topic</option>{topics.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>Give your enquiry a short title<input name="subject" required minLength={5} maxLength={180} placeholder={reason==='access'?'e.g. I cannot open the project repository':reason==='application'?'e.g. A question about my application':'e.g. Help updating my profile'}/></label>
    <label>Tell us what is happening<textarea name="description" required minLength={20} maxLength={5000} rows={5} placeholder={reason==='conduct'?'Explain what happened and what help you need. Include relevant names or dates where useful.':'Add the details we need to understand your question, including any relevant page or application reference.'}/><small>Include safe evidence links if useful. Keep passwords and access keys out of your message.</small></label>
    <footer className="lxFormFooter"><small>Your enquiry goes privately to Mettelo support.</small><button className="lxButton primary">Send enquiry <span aria-hidden="true">→</span></button></footer>
   </LabActionForm>
  </div></dialog>
 </div>;
}
