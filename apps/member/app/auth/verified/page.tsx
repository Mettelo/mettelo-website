import AccountJourneyCard from '@/components/AccountJourneyCard';
import {safeMemberPath} from '@/lib/auth-navigation.mjs';
export default async function Verified({searchParams}:{searchParams:Promise<{next?:string}>}){
  const next=safeMemberPath((await searchParams).next,'/onboarding');
  return <AccountJourneyCard eyebrow="Your next step" title="Make Mettelo yours." kind="success"><p className="lead">If your email verification succeeded, continue to choose your username and complete your professional profile.</p><p className="journeyHint">Your profile helps you introduce your skills and interests. Save at least 80% before submitting interest in a project.</p><div className="actions"><a className="button dark" href={next}>Continue setup →</a><a className="button ghost" href="/signin">Back to sign in</a></div></AccountJourneyCard>;
}
