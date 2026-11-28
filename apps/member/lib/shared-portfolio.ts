import 'server-only';
import {cache} from 'react';
import {createServerSupabaseClient} from './supabase/server';
import type {SharedProof} from '@/components/PortfolioProofCard';
export const readSharedProof=cache(async(token:string):Promise<SharedProof|null>=>{if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token))return null;const db=await createServerSupabaseClient();const {data,error}=await db.rpc('website_public_portfolio_share',{p_token:token});if(error)throw Error('Shared summary could not load.');return data as SharedProof|null;});
