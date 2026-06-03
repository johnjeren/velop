import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import EnvelopeDashboard from '@/components/EnvelopeDashboard'

export default async function HomePage() {
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

  const householdId = (profile as any).household_id

  const { data: balances } = await supabase
    .from('envelope_balances')
    .select('*')
    .eq('household_id', householdId)
    .order('name')

  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('*, profiles(display_name, avatar_color), envelopes(name, icon)')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Bills summary for dashboard widget
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  // Fetch upcoming bills for the feed
  const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: upcomingBills } = await supabase
    .from('bill_instances')
    .select('*, recurring_bills(name, icon)')
    .eq('household_id', householdId)
    .gte('due_date', today)
    .lte('due_date', next30Days)
    .order('due_date')
    .limit(10)

  const { data: unpaidInstances } = await supabase
    .from('bill_instances')
    .select('amount, due_date')
    .eq('household_id', householdId)
    .eq('status', 'unpaid')
    .gte('due_date', monthStart)
    .lte('due_date', monthEnd)

  const billsSummary = unpaidInstances && unpaidInstances.length > 0 ? {
    totalDue: (unpaidInstances as any[]).reduce((s, i) => s + Number(i.amount), 0),
    unpaidCount: unpaidInstances.length,
    overdueCount: (unpaidInstances as any[]).filter(i => i.due_date < today).length,
  } : null

  // This month's spend per envelope — feeds spending-pace insights
  const { data: monthSpends } = await supabase
    .from('transactions')
    .select('envelope_id, amount, type, transaction_date, merchant')
    .eq('household_id', householdId)
    .eq('type', 'spend')
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)

  return (
    <AppShell profile={profile}>
      <div className="animate-fade-in">
        <EnvelopeDashboard
          balances={balances || []}
          recentTransactions={recentTransactions || []}
          upcomingBills={upcomingBills || []}
          billsSummary={billsSummary}
          monthSpends={(monthSpends as any) || []}
        />
      </div>
    </AppShell>
  )
}
