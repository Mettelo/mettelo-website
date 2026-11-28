import { createBrowserClient } from '@supabase/ssr';
import {memberSupabaseConfiguration} from './config';

export function createClient(){
  const {url,key:anonKey}=memberSupabaseConfiguration();

  if(!url || !anonKey){
    throw new Error('Supabase environment variables are not configured.');
  }

  return createBrowserClient(url, anonKey);
}
