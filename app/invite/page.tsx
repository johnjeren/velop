import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import InviteClient from './InviteClient'
import Link from 'next/link'

export const metadata = {
  title: 'Accept Invite | Envelope Budget',
}

export default async function InvitePage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token
  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>Invalid Link</h1>
          <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>This invite link is missing a token.</p>
        </div>
      </div>
    )
  }

  const supabase = await createServerSupabaseClient()
  
  // Fetch the invite (Note: Requires RLS policy to allow reading by token)
  const { data: invite, error } = await supabase
    .from('household_invites')
    .select('*, households(name), profiles!household_invites_invited_by_fkey(display_name)')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>Invite Not Found</h1>
          <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
            This invite link is invalid, expired, or you don't have permission to view it.
          </p>
        </div>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>You've been invited!</h1>
          <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{(invite as any).profiles?.display_name}</strong> invited you to join 
            the <strong style={{ color: 'var(--text-primary)' }}>{(invite as any).households?.name}</strong> household.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            <Link href={`/login?next=/invite?token=${token}`} className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              Log In to Accept
            </Link>
            <Link href={`/signup?next=/invite?token=${token}`} className="btn btn-ghost" style={{ justifyContent: 'center', padding: '12px' }}>
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <InviteClient 
      invite={invite as any} 
      profile={profile as any} 
    />
  )
}
