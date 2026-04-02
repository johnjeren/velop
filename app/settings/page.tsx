import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import SettingsPanel from '@/components/SettingsPanel'

export default async function SettingsPage() {
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

  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('household_id', (profile as any).household_id)

  return (
    <AppShell profile={profile}>
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '24px' }}>
          Settings
        </h1>
        <SettingsPanel 
          profile={profile}
          members={members || []}
        />
      </div>
    </AppShell>
  )
}
