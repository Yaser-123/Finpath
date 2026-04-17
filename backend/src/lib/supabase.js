const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[supabase] WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Some features will fail.');
}

/**
 * Service-role Supabase client — bypasses RLS for server-side operations.
 * Use ONLY in backend route handlers, never expose to clients.
 */
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

module.exports = { supabase };
