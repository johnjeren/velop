import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import SpendingCharts from '@/components/SpendingCharts'

export default async function ChartsPage() {
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

  if (!profile || !profile.household_id) {
    redirect('/onboarding')
  }

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, envelopes(name, icon, color)')
    .eq('household_id', profile.household_id)
    .order('transaction_date', { ascending: false })
    .limit(500)

  const { data: envelopes } = await supabase
    .from('envelope_balances')
    .select('*')
    .eq('household_id', profile.household_id)
    .order('name')

  return (
    <AppShell profile={profile}>
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '24px' }}>
          Charts
        </h1>
        <SpendingCharts 
          transactions={transactions || []} 
          envelopes={envelopes || []}
        />
      </div>
    </AppShell>
  )
}
