import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Service-role client for server-only jobs (e.g. the notify cron) that need to
// read across households. Never import this into client components — it bypasses RLS.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
