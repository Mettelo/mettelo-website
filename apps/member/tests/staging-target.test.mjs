import {test} from 'node:test';
import assert from 'node:assert/strict';
import {memberSupabaseConfiguration} from '../lib/supabase/config.ts';
test('development database client refuses production and unrelated projects',()=>{
  const priorURL=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const priorKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try{
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='synthetic-public-key';
    for(const url of ['https://aconptuqupsgznyrxhrh.supabase.co','https://other-project.supabase.co','https://jxijdjmjuzslmjxolhjl.supabase.co.evil.test']){
      process.env.NEXT_PUBLIC_SUPABASE_URL=url;assert.throws(()=>memberSupabaseConfiguration(),/isolated staging/);
    }
    process.env.NEXT_PUBLIC_SUPABASE_URL='https://jxijdjmjuzslmjxolhjl.supabase.co';
    assert.equal(memberSupabaseConfiguration().url,process.env.NEXT_PUBLIC_SUPABASE_URL);
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.throws(()=>memberSupabaseConfiguration(),/not configured/);
  }finally{
    if(priorURL===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=priorURL;
    if(priorKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=priorKey;
  }
});
