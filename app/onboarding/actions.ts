'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function setupHousehold(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const householdName = formData.get('householdName') as string
  const displayName = formData.get('displayName') as string

  if (!householdName || !displayName) {
    return { error: 'Missing required fields' }
  }

  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name: householdName } as any)
    .select()
    .single()

  if (householdError) {
    return { error: 'Failed to create household: ' + householdError.message }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      display_name: displayName,
      household_id: (household as any).id,
      avatar_color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
    } as any)

  if (profileError) {
    return { error: 'Failed to update profile: ' + profileError.message }
  }

  redirect('/')
}
