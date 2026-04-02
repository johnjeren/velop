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

  const { data: balances } = await supabase
    .from('envelope_balances')
    .select('*')
    .eq('household_id', (profile as any).household_id)
    .order('name')

  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('*, profiles(display_name, avatar_color), envelopes(name, icon)')
    .eq('household_id', (profile as any).household_id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <AppShell profile={profile}>
      <EnvelopeDashboard 
        balances={balances || []} 
        recentTransactions={recentTransactions || []} 
      />
    </AppShell>
  )
}
