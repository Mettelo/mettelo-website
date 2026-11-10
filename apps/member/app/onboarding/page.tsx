import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import AccountJourneyCard from '@/components/AccountJourneyCard';
import MemberIdentityClaimForm from '@/components/MemberIdentityClaimForm';
export const dynamic='force-dynamic';
export default async function Onboarding(){
  const db=await createServerSupabaseClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)redirect('/signin');
  if(!user.email_confirmed_at)redirect('/auth/check-email');
  const {data,error}=await db.from('profiles').select('username').eq('id',user.id).single();
  if(error)throw new Error('Your account could not be loaded. Please try again.');
  if(data.username)redirect('/member/profile');
  return <AccountJourneyCard eyebrow="Account setup · Your identity" title="Choose your username." kind="success"><p>Give your Mettelo account a name you recognise. It can be different from your GitHub username.</p><MemberIdentityClaimForm next="/member/profile"/><p className="journeyHint"><strong>Next: your professional profile.</strong> Add your background, skills and goals. Save at least 80% of your profile before submitting project interest.</p></AccountJourneyCard>;
}
