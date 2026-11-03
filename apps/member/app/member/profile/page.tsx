import {safeMemberPath} from '@/lib/auth-navigation.mjs';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {profileColumns} from '@/lib/profile-contract.mjs';
import MemberProfileForm from '@/components/MemberProfileForm';
import ProfilePhotoEditor from '@/components/ProfilePhotoEditor';
export const dynamic='force-dynamic';
export default async function ProfilePage({searchParams}:{searchParams:Promise<{next?:string}>}){
  const requestedNext=(await searchParams).next;
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
  return <section className="section"><div className="shell profileShell"><div className="eyebrow">My Mettelo</div><h1>Your professional profile</h1><p className="lead">Introduce yourself, share your focus and add the work you want to build on. Your details stay private.</p><ProfilePhotoEditor photoUrl={photo?.data?.signedUrl||null}/><MemberProfileForm profile={profile} prefill={prefill.data} returnTo={returnTo}/></div></section>;
}
