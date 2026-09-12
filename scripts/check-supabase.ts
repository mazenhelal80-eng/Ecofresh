import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

function loadEnv() {
  if (fs.existsSync('.env')) {
    const lines = fs.readFileSync('.env', 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  console.log('Supabase URL:', url);
  console.log('Has Anon Key:', !!anonKey);
  console.log('Has Service Role Key:', !!serviceKey);

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.getSession();
  console.log('Anon getSession result:', { data, error });
}

checkSupabase().catch(console.error);
