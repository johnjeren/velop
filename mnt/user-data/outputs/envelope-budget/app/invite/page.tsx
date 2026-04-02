'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function InvitePage() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const supabase = createClient()

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [invite, setInvite] = useState<{ household_id: string; households: { name: string } | null } | null>(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    supabase
      .from('household_invites')
      .select('household_id, households(name)')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('error') }
        else { setInvite(data as typeof invite); setStatus('ready') }
      })
  }, [token])

  async function acceptInvite() {
    if (!invite || !token) return
    setJoining(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Store token and redirect to signup
      sessionStorage.setItem('invite_token', token)
      router.push(`/signup?invite=${token}`)
      return
    }

    // Mark invite used
    await supabase
      .from('household_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    // Join household
    const { error } = await supabase
      .from('profiles')
      .update({ household_id: invite.household_id })
      .eq('id', user.id)

    if (error) { toast.error('Failed to join household'); setJoining(false); return }

    toast.success('Joined! Welcome to the household 🏠')
    router.push('/')
    router.refresh()
  }

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Checking invite…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontWeight: '700', marginBottom: '8px' }}>Invalid invite</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            This link may have expired or already been used.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="card animate-fade-in" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
        <h2 style={{ fontWeight: '700', fontSize: '22px', marginBottom: '8px' }}>
          You&apos;re invited!
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '15px' }}>
          Join <strong style={{ color: 'var(--text-primary)' }}>
            {invite?.households?.name ?? 'a household'}
          </strong> and start budgeting together.
        </p>
        <button
          className="btn btn-primary"
          onClick={acceptInvite}
          disabled={joining}
          style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
        >
          {joining ? 'Joining…' : 'Accept invite'}
        </button>
      </div>
    </div>
  )
}
