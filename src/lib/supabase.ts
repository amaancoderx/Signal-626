import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Server-side client (uses service role key)
export function createServerClient() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
  );
}
