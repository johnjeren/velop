import { createServerSupabaseClient } from '@/lib/supabase/server'
import SpendingCharts from '@/components/SpendingCharts'

export default async function ChartsPage() {
  const supabase = await createServerSupabaseClient()

  // Last 6 months of transactions
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, envelopes(name, icon, color)')
    .gte('transaction_date', sixMonthsAgo.toISOString().split('T')[0])
    .order('transaction_date', { ascending: true })

  const { data: envelopes } = await supabase
    .from('envelope_balances')
    .select('*')
    .eq('archived', false)

  return <SpendingCharts transactions={transactions ?? []} envelopes={envelopes ?? []} />
}
