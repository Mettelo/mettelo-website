import AccountJourneyCard from '@/components/AccountJourneyCard';
import type {Metadata} from 'next';

export const metadata:Metadata={title:'Password updated',description:'Your Mettelo password has been updated successfully.'};
export default function PasswordChangedPage(){return <AccountJourneyCard eyebrow="Account security" title="Password updated." kind="success"><p className="lead">Your new password is ready to use the next time you sign in.</p><div className="actions"><a className="button dark" href="/member">Continue to My Mettelo →</a><a className="button ghost" href="/signin">Back to sign in</a></div></AccountJourneyCard>}
