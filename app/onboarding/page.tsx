'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [householdName, setHouseholdName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.rpc('create_household_and_profile', {
        p_household_name: householdName,
        p_display_name: displayName,
      } as any)

      if (error) {
        toast.error('Failed to set up household: ' + error.message)
        setLoading(false)
        return
      }

      toast.success('Welcome to Envelope!')
      router.push('/')
      router.refresh()
    } catch (err) {
      toast.error('An error occurred')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '40px 36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: 'var(--font-sans)',
            fontSize: '36px',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: 'var(--text-primary)',
            borderBottom: '5px solid var(--accent)',
            paddingBottom: '2px',
            lineHeight: 1,
          }}>
            Velop
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '20px' }}>Welcome</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Let's set up your household budget
          </p>
        </div>

        <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label">Your Name</label>
            <input
              className="input"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="label">Household Name</label>
            <input
              className="input"
              type="text"
              value={householdName}
              onChange={e => setHouseholdName(e.target.value)}
              placeholder="Smith Family Budget"
              required
            />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              You can invite others to join later
            </p>
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '4px', padding: '12px' }}
          >
            {loading ? 'Setting up…' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  )
}
