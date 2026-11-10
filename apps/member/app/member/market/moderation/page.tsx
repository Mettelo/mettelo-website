import MarketWorkspace from '../MarketWorkspace';
import {redirect} from 'next/navigation';
import {labSession} from '@/lib/lab';
import {communityRpc} from '@/lib/market-community';
import {SocialAction,Notices} from '../CommunityControls';
import '../market.css';
export const dynamic='force-dynamic';
type ReportRecord={id:string;kind:string;reason:string;snapshot:{body?:string;username?:string;headline?:string};created_at:string};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const query=await searchParams,{db,user}=await labSession();if(!user)redirect('/signin?next=%2Fmember%2Fmarket%2Fmoderation');
 const page=Math.max(1,Math.min(100000,parseInt(query.page||'1',10)||1));let reports:ReportRecord[]=[],failed=false;
 try{reports=(await communityRpc(db,'reports',{page})).rows;}catch{failed=true;}
 return <MarketWorkspace active="moderation" title="Market reports" description="Review reported excerpts while preserving private conversations and Lab access."><Notices query={query}/>{failed?<p role="alert">Reports are unavailable. An authorised operations administrator is required.</p>:<><div className="marketList">{reports.map(report=><article className="marketCard" key={report.id}><header><strong>{report.kind} report</strong><time dateTime={report.created_at}>{new Date(report.created_at).toLocaleDateString('en-GB')}</time></header><h2>Reported excerpt</h2><blockquote>{report.snapshot.body||report.snapshot.headline||report.snapshot.username||'Member profile'}</blockquote><p>Reason: {report.reason}</p><SocialAction action="resolve_report" view="moderation" fields={{report_id:report.id}}><label>Review outcome and reason<textarea name="reason" rows={2} minLength={8} maxLength={1000} required/></label>{['post','comment'].includes(report.kind)&&<label className="marketCheck"><input name="enabled" value="true" type="checkbox"/>Remove reported content from the community</label>}<input type="hidden" name="enabled" value="false"/><p className="marketMeta">Account restrictions use the existing account administration process.</p><button className="pcButton">Record outcome and resolve</button></SocialAction></article>)}</div>{reports.length===0&&<p>No open reports.</p>}<nav className="marketPagination" aria-label="Report pages">{page>1&&<a href={'?page='+(page-1)}>← Previous</a>}{reports.length===25&&<a href={'?page='+(page+1)}>Next →</a>}</nav></>}</MarketWorkspace>;
}
