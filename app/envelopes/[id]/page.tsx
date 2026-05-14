import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import EnvelopeDetail from '@/components/EnvelopeDetail'

interface PageProps {
  params: { id: string }
  searchParams: { month?: string }
}

function parseMonthKey(input: string | undefined): string {
  if (input && /^\d{4}-(0[1-9]|1[0-2])$/.test(input)) return input
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(key: string): { start: string; nextStart: string } {
  const [y, m] = key.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const next = new Date(y, m, 1) // m is 1-12, Date month is 0-11 so this is next month
  const nextStart = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
  return { start, nextStart }
}

export default async function EnvelopeDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, households(name)')
    .eq('id', user.id)
    .single()

  if (!profile || !(profile as any).household_id) {
    redirect('/onboarding')
  }

  const householdId = (profile as any).household_id

  const { data: envelope } = await supabase
    .from('envelope_balances')
    .select('*')
    .eq('envelope_id', params.id)
    .eq('household_id', householdId)
    .single()

  if (!envelope) notFound()

  const monthKey = parseMonthKey(searchParams.month)
  const { start, nextStart } = monthRange(monthKey)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, profiles(display_name, avatar_color), envelopes(name, icon, color)')
    .eq('household_id', householdId)
    .eq('envelope_id', params.id)
    .gte('transaction_date', start)
    .lt('transaction_date', nextStart)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: allEnvelopes } = await supabase
    .from('envelope_balances')
    .select('*')
    .eq('household_id', householdId)
    .order('name')

  return (
    <AppShell profile={profile}>
      <EnvelopeDetail
        envelope={envelope as any}
        envelopes={(allEnvelopes as any) || []}
        transactions={(transactions as any) || []}
        monthKey={monthKey}
      />
    </AppShell>
  )
}
