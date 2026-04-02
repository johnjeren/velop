import { createServerSupabaseClient } from '@/lib/supabase/server'
import SettingsPanel from '@/components/SettingsPanel'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, households(id, name)')
    .eq('id', user!.id)
    .single()

  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_color, created_at')
    .eq('household_id', profile?.household_id ?? '')

  return <SettingsPanel profile={profile} members={members ?? []} />
}
