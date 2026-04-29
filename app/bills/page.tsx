import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import BillsTracker from '@/components/BillsTracker'

export const metadata = {
  title: 'Bills | Envelope Budget',
  description: 'Track recurring monthly bills and subscriptions',
}

export default async function BillsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, households(name)')
    .eq('id', user.id)
    .single()

  if (!profile || !(profile as any).household_id) redirect('/onboarding')

  const householdId = (profile as any).household_id

  // Fetch active recurring bill definitions
  const { data: bills } = await supabase
    .from('recurring_bills')
    .select('*, envelopes(name, icon)')
    .eq('household_id', householdId)
    .eq('active', true)
    .order('due_day')

  // Fetch this month's bill instances
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: instances } = await supabase
    .from('bill_instances')
    .select('*, recurring_bills(name, icon, auto_pay, envelope_id)')
    .eq('household_id', householdId)
    .gte('due_date', monthStart)
    .lte('due_date', monthEnd)
    .order('due_date')

  // Fetch envelopes for the modal dropdown
  const { data: envelopes } = await supabase
    .from('envelopes')
    .select('id, name, icon, color')
    .eq('household_id', householdId)
    .eq('archived', false)
    .order('name')

  return (
    <AppShell profile={profile}>
      <div className="animate-fade-in">
        <BillsTracker
          bills={(bills || []) as any}
          instances={(instances || []) as any}
          envelopes={envelopes || []}
        />
      </div>
    </AppShell>
  )
}
