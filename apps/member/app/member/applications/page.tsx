import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
// Preserve Home links and bookmarks while keeping one project journey.
export default async function ProjectApplications({searchParams}:{searchParams:Promise<{preview?:string}>}){
 const query=await searchParams;
 redirect('/member/lab'+(process.env.NODE_ENV==='development'&&query.preview==='cards'?'?preview=cards':''));
}
