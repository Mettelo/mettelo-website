import {NextResponse} from 'next/server';
import {headerAccount} from '@/lib/header-account';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie'};
/** Current-member presentation only. No tokens, emails or reusable authorisation claims. */
export async function GET(){try{const account=await headerAccount();return NextResponse.json(account?{authenticated:true,...account}:{authenticated:false},{headers});}catch{return NextResponse.json({authenticated:false},{status:503,headers});}}
