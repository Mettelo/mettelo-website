import MarketConnections from '@/components/MarketConnections';
import MarketProfilePreferences from '@/components/MarketProfilePreferences';
import './sharing.css';
import {safeMemberPath} from '@/lib/auth-navigation.mjs';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {profileColumns} from '@/lib/profile-contract.mjs';
import MemberProfileView from '@/components/MemberProfileView';
export const dynamic='force-dynamic';
export default async function ProfilePage({searchParams}:{searchParams:Promise<{next?:string;notice?:string;error?:string}>}){
  const query=await searchParams,requestedNext=query.next;
  const returnTo=requestedNext?safeMemberPath(requestedNext,'/member/profile'):undefined;
  const db=await createServerSupabaseClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)redirect('/signin?next=%2Fmember%2Fprofile');
  if(!user.email_confirmed_at)redirect('/auth/check-email');
  const [{data,error},prefill]=await Promise.all([db.from('profiles').select(profileColumns+',avatar_path').eq('id',user.id).single(),db.rpc('get_my_profile_prefill')]);
  if(error||prefill.error)throw new Error('Your private profile could not be loaded. Please try again.');
  const profile=data as unknown as Record<string,unknown>;
  if(!profile.username)redirect('/onboarding');
  const photo=profile.avatar_path?await db.storage.from('website-profile-photos').createSignedUrl(String(profile.avatar_path),300):null;
  return <section className="section"><div className="shell"><MemberProfileView profile={profile} prefill={prefill.data} photoUrl={photo?.data?.signedUrl||null} returnTo={returnTo} sharingSettings={<><MarketConnections db={db} memberId={user.id} userId={user.id}/><MarketProfilePreferences db={db} notice={query.notice} error={query.error}/></>}/></div></section>;
}
