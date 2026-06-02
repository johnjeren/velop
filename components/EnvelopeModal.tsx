'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { EnvelopeBalance } from '@/lib/supabase/database.types'

const ICONS = ['💰','🏠','🚗','🍔','🛒','🏥','💊','✈️','🎬','👗','📱','⚡','🐾','🎁','📚','🏋️','💻','🎵','🌴','💈']
const COLORS = ['#D97706','#059669','#2563EB','#7C3AED','#DC2626','#0891B2','#C026D3','#65A30D','#EA580C','#0D9488']

interface Props {
  envelope: EnvelopeBalance | null
  onClose: () => void
  onSaved: () => void
}

export default function EnvelopeModal({ envelope, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [name, setName] = useState(envelope?.name ?? '')
  const [icon, setIcon] = useState(envelope?.icon ?? '💰')
  const [color, setColor] = useState(envelope?.color ?? '#D97706')
  const [budget, setBudget] = useState(envelope?.budget_amount ? String(envelope.budget_amount) : '')
  const [isGoal, setIsGoal] = useState(envelope?.is_goal ?? false)
  const [targetAmount, setTargetAmount] = useState(envelope?.target_amount ? String(envelope.target_amount) : '')
  const [targetDate, setTargetDate] = useState(envelope?.target_date ?? '')
  const [resetMonthly, setResetMonthly] = useState(envelope?.reset_monthly ?? false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Name is required'); return }
    setLoading(true)

    const payload = {
      name: name.trim(),
      icon,
      color,
      budget_amount: parseFloat(budget) || 0,
      is_goal: isGoal,
      target_amount: isGoal ? (parseFloat(targetAmount) || null) : null,
      target_date: isGoal ? (targetDate || null) : null,
      reset_monthly: resetMonthly,
    }

    if (envelope) {
      const { error } = await (supabase.from('envelopes') as any)
        .update(payload)
        .eq('id', envelope.envelope_id)
      if (error) { toast.error(error.message) } else { toast.success('Envelope updated!'); onSaved() }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user!.id).single()
      const { error } = await (supabase.from('envelopes') as any).insert({
        ...payload,
        household_id: (profile as any)!.household_id!,
      })
      if (error) { toast.error(error.message) } else { toast.success('Envelope created!'); onSaved() }
    }
    setLoading(false)
  }

  async function handleArchive() {
    if (!envelope) return
    setDeleting(true)
    const { error } = await (supabase.from('envelopes') as any).update({ archived: true }).eq('id', envelope.envelope_id)
    if (error) { toast.error(error.message) } else { toast.success('Envelope archived'); onSaved() }
    setDeleting(false)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
            {envelope ? 'Edit Envelope' : 'New Envelope'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--text-secondary)',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Type Segmented Control */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-primary)',
            padding: '4px',
            borderRadius: 'var(--radius-pill)',
          }}>
            <button
              type="button"
              onClick={() => setIsGoal(false)}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--radius-pill)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: '600',
                background: !isGoal ? 'var(--bg-surface)' : 'transparent',
                color: !isGoal ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: !isGoal ? 'var(--shadow-sm)' : 'none', transition: 'all 150ms ease',
              }}
            >
              Monthly Budget
            </button>
            <button
              type="button"
              onClick={() => setIsGoal(true)}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--radius-pill)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: '600',
                background: isGoal ? 'var(--bg-surface)' : 'transparent',
                color: isGoal ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isGoal ? 'var(--shadow-sm)' : 'none', transition: 'all 150ms ease',
              }}
            >
              Savings Goal
            </button>
          </div>

          <div>
            <label className="label">Name</label>
            <input className="input" type="text" placeholder="e.g. Groceries" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          {!isGoal ? (
            <>
              <div>
                <label className="label">Monthly budget</label>
                <input
                  className="input" type="number" min="0" step="0.01" placeholder="0.00"
                  value={budget} onChange={e => setBudget(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                <input 
                  type="checkbox" 
                  id="resetMonthly" 
                  checked={resetMonthly} 
                  onChange={e => setResetMonthly(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor="resetMonthly" style={{ fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                    Reset balance monthly
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-disabled)' }}>Zeroes out unused funds on the 1st of each month</span>
                </div>
              </div>
            </>
          ) : (
            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">Target amount</label>
                <input
                  className="input" type="number" min="0" step="0.01" placeholder="0.00"
                  value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div>
                <label className="label">Target date</label>
                <input
                  className="input" type="date"
                  value={targetDate} onChange={e => setTargetDate(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ICONS.map(i => (
                <button
                  key={i} type="button"
                  onClick={() => setIcon(i)}
                  style={{
                    width: '38px', height: '38px', fontSize: '20px',
                    border: icon === i ? '2px solid var(--accent)' : '2px solid transparent',
                    borderRadius: 'var(--radius-sm)', background: icon === i ? 'var(--accent-light)' : 'var(--bg-subtle)',
                    cursor: 'pointer', transition: 'all 0.1s ease',
                  }}
                >{i}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Color</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '28px', height: '28px', background: c,
                    border: color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                    cursor: 'pointer', transition: 'border 0.1s ease',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>

          {envelope && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={deleting}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}
            >
              {deleting ? 'Archiving…' : 'Archive envelope'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
