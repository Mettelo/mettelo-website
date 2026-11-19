import type {ReactNode} from 'react';
export default function MarketActionForm({action,tab,team,member,request,children}:{action:string;tab:string;team?:string;member?:string;request?:string;children:ReactNode}){
 return <form className="marketForm" method="post" action="/api/lab-market"><input type="hidden" name="action" value={action}/><input type="hidden" name="return_tab" value={tab}/>{team&&<input type="hidden" name="team_id" value={team}/ >}{member&&<input type="hidden" name="member_id" value={member}/ >}{request&&<input type="hidden" name="request_id" value={request}/ >}{children}</form>;
}
