'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function InviteClient({ invite, profile }: { invite: any, profile: any }) {
  const supabase = createClient()
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)

  const householdName = invite.households?.name || 'this household'
  const inviterName = invite.profiles?.display_name || 'Someone'

  const isAlreadyMember = profile.household_id === invite.household_id

  async function handleAccept() {
    setAccepting(true)
    
    // Update the current user's profile to belong to the new household
    const { error } = await (supabase.from('profiles') as any)
      .update({ household_id: invite.household_id })
      .eq('id', profile.id)

    if (error) {
      toast.error(error.message)
      setAccepting(false)
      return
    }

    toast.success('Successfully joined the household!')
    router.push('/')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="card animate-fade-in" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤝</div>
        
        {isAlreadyMember ? (
          <>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>You're already in!</h1>
            <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
              You are already a member of <strong style={{ color: 'var(--text-primary)' }}>{householdName}</strong>.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => router.push('/')}
              style={{ width: '100%', justifyContent: 'center', marginTop: '24px', padding: '12px' }}
            >
              Go to Dashboard
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em' }}>Join {householdName}</h1>
            <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{inviterName}</strong> invited you to join their budget. 
              Accepting this invite will link your account to their envelopes and transactions.
            </p>
            
            <button 
              className="btn btn-primary" 
              onClick={handleAccept}
              disabled={accepting}
              style={{ width: '100%', justifyContent: 'center', marginTop: '24px', padding: '12px' }}
            >
              {accepting ? 'Joining...' : 'Accept Invite'}
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={() => router.push('/')}
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '12px' }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
