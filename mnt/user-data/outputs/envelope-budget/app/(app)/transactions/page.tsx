import { createServerSupabaseClient } from '@/lib/supabase/server'
import TransactionList from '@/components/TransactionList'

export default async function TransactionsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, profiles(display_name, avatar_color), envelopes(name, icon, color)')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: envelopes } = await supabase
    .from('envelopes')
    .select('id, name, icon, color')
    .eq('archived', false)
    .order('sort_order')

  return <TransactionList transactions={transactions ?? []} envelopes={envelopes ?? []} />
}
