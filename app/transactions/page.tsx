import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import TransactionList from '@/components/TransactionList'

export default async function TransactionsPage() {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, households(name)')
    .eq('id', user.id)
    .single()

  if (!profile || !(profile as any).household_id) {
    redirect('/onboarding')
  }

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, profiles(display_name, avatar_color), envelopes(name, icon)')
    .eq('household_id', (profile as any).household_id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: envelopes } = await supabase
    .from('envelopes')
    .select('id, name, icon')
    .eq('household_id', (profile as any).household_id)
    .order('name')

  return (
    <AppShell profile={profile}>
      <div className="animate-fade-in">
        <TransactionList 
          transactions={transactions || []} 
          envelopes={envelopes || []}
        />
      </div>
    </AppShell>
  )
}
