'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

interface Props {
  profile: {
    id: string
    display_name: string
    avatar_color: string
    household_id: string | null
    households?: { id: string; name: string } | null
  } | null
  members: { id: string; display_name: string; avatar_color: string; created_at: string }[]
}

const COLORS = ['#D97706','#059669','#2563EB','#7C3AED','#DC2626','#0891B2','#C026D3','#65A30D','#EA580C','#0D9488']

export default function SettingsPanel({ profile, members }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Use useEffect to ensure we only render theme-dependent UI after hydration
  useEffect(() => setMounted(true), [])

  const [householdName, setHouseholdName] = useState(profile?.households?.name ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color ?? '#D97706')
  const [inviteLink, setInviteLink] = useState('')
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [saving, setSaving] = useState(false)

  async function saveHouseholdName() {
    if (!householdName.trim() || !profile?.household_id) return
    setSaving(true)
    const { error } = await (supabase.from('households') as any).update({ name: householdName.trim() }).eq('id', profile.household_id)
    if (error) { toast.error(error.message) } else { toast.success('Saved!'); router.refresh() }
    setSaving(false)
  }

  async function saveProfile() {
    if (!displayName.trim() || !profile?.id) return
    setSaving(true)
    const { error } = await (supabase.from('profiles') as any).update({ display_name: displayName.trim(), avatar_color: avatarColor }).eq('id', profile.id)
    if (error) { toast.error(error.message) } else { toast.success('Profile updated!'); router.refresh() }
    setSaving(false)
  }

  async function generateInvite() {
    if (!profile?.household_id) return
    setGeneratingInvite(true)
    const { data, error } = await supabase
      .from('household_invites')
      .insert({ household_id: profile.household_id, invited_by: profile.id } as any)
      .select('token')
      .single()

    if (error || !data) { toast.error('Could not generate invite'); setGeneratingInvite(false); return }

    const link = `${window.location.origin}/invite?token=${(data as any).token}`
    setInviteLink(link)
    await navigator.clipboard.writeText(link).catch(() => {})
    toast.success('Invite link copied to clipboard!')
    setGeneratingInvite(false)
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '560px' }}>

      {/* Household */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>🏠 Household</h2>
        <label className="label">Household name</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input className="input" type="text" value={householdName} onChange={e => setHouseholdName(e.target.value)} />
          <button className="btn btn-primary" onClick={saveHouseholdName} disabled={saving}>Save</button>
        </div>
      </section>

      {/* Profile */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>👤 Your Profile</h2>

        {/* Avatar preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%', background: avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '20px', fontWeight: '700',
          }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setAvatarColor(c)}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%', background: c,
                  border: avatarColor === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        <label className="label">Display name</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input className="input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>Save</button>
        </div>
      </section>

      {/* Appearance */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>🎨 Appearance</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, border: mounted && theme === 'light' ? '2px solid var(--accent)' : '2px solid transparent' }}
            onClick={() => setTheme('light')}
          >
            ☀️ Light
          </button>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, border: mounted && theme === 'dark' ? '2px solid var(--accent)' : '2px solid transparent' }}
            onClick={() => setTheme('dark')}
          >
            🌙 Dark
          </button>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, border: mounted && theme === 'system' ? '2px solid var(--accent)' : '2px solid transparent' }}
            onClick={() => setTheme('system')}
          >
            💻 System
          </button>
        </div>
      </section>

      {/* Members */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>👥 Members ({members.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', background: m.avatar_color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '14px', fontWeight: '700',
              }}>
                {m.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>{m.display_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {m.id === profile?.id ? 'You · ' : ''}
                  Joined {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <button className="btn btn-ghost" onClick={generateInvite} disabled={generatingInvite} style={{ width: '100%', justifyContent: 'center' }}>
            {generatingInvite ? 'Generating…' : '🔗 Generate invite link'}
          </button>
          {inviteLink && (
            <div style={{
              marginTop: '12px', padding: '10px 14px',
              background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
              fontSize: '12px', wordBreak: 'break-all', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}>
              {inviteLink}
            </div>
          )}
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Share this link with your wife so she can join your household. Link expires in 7 days.
          </p>
        </div>
      </section>

      {/* Sign out */}
      <section className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Account</h2>
        <button
          className="btn btn-ghost"
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
        >
          Sign out
        </button>
      </section>
    </div>
  )
}
