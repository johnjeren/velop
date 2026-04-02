import { createServerSupabaseClient } from '@/lib/supabase/server'
import EnvelopeDashboard from '@/components/EnvelopeDashboard'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()

  const { data: balances } = await supabase
    .from('envelope_balances')
    .select('*')
    .eq('archived', false)
    .order('balance', { ascending: true })

  const { data: recentTx } = await supabase
    .from('transactions')
    .select('*, profiles(display_name, avatar_color), envelopes(name, icon)')
    .order('created_at', { ascending: false })
    .limit(10)

  return <EnvelopeDashboard balances={balances ?? []} recentTransactions={recentTx ?? []} />
}
