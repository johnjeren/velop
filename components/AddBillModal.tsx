'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const ICONS = ['🔁','🏠','📺','💡','💧','📱','🚗','🏥','🎵','🍕','🏋️','☁️','🔒','📡','🎮','🛡️', '📈', '🏦', '🎓', '💸']
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

interface Envelope {
  id: string
  name: string
  icon: string
}

interface Props {
  envelopes: Envelope[]
  onClose: () => void
  onSaved: () => void
}

export default function AddBillModal({ envelopes, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🔁')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState(1)
  const [envelopeId, setEnvelopeId] = useState('')
  const [autoPay, setAutoPay] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!name.trim()) { toast.error('Enter a name'); return }
    if (isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid amount'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user!.id).single()
    const householdId = (profile as any)!.household_id!

    const { error } = await supabase.from('recurring_bills').insert({
      household_id: householdId,
      name: name.trim(),
      icon,
      amount: parsed,
      due_day: dueDay,
      envelope_id: envelopeId || null,
      auto_pay: autoPay,
      notes: notes.trim() || null,
    } as any)

    if (error) {
      toast.error(error.message)
    } else {
      const today = new Date()
      const dueDate = new Date(today.getFullYear(), today.getMonth(), Math.min(dueDay, 28))
      const { data: bill } = await supabase
        .from('recurring_bills')
        .select('id')
        .eq('household_id', householdId)
        .eq('name', name.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (bill) {
        await supabase.from('bill_instances').insert({
          household_id: householdId,
          bill_id: (bill as any).id,
          due_date: dueDate.toISOString().split('T')[0],
          amount: parsed,
        } as any)
      }

      toast.success('Recurring item added!')
      onSaved()
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ padding: '28px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}>
            Add Recurring Item
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: 'none',
              border: '1px solid var(--border-strong)',
              borderRadius: '0',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px 10px',
            }}
          >
            [ X ]
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div>
              <label className="label">Icon</label>
              <button
                type="button"
                onClick={() => setShowIconPicker(v => !v)}
                style={{
                  width: '46px', height: '46px', fontSize: '22px',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {icon}
              </button>
              {showIconPicker && (
                <div style={{
                  position: 'absolute', background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
                  padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px',
                  width: '240px', zIndex: 10, boxShadow: 'var(--shadow-lg)'
                }}>
                  {ICONS.map(ic => (
                    <button
                      key={ic} type="button"
                      onClick={() => { setIcon(ic); setShowIconPicker(false) }}
                      style={{
                        fontSize: '22px', border: ic === icon ? '1px solid var(--accent)' : '1px solid transparent', cursor: 'pointer',
                        padding: '6px', borderRadius: '0',
                        background: ic === icon ? 'var(--accent-light)' : 'transparent',
                        transition: 'background 120ms ease'
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Name</label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Mortgage, ETF, Netflix…"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Amount</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              style={{ fontSize: '22px' }}
              required
            />
          </div>

          <div>
            <label className="label">Day of Month</label>
            <select className="input" value={dueDay} onChange={e => setDueDay(parseInt(e.target.value))}>
              {DAYS.map(d => <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Link to Envelope (optional)</label>
            <select className="input" value={envelopeId} onChange={e => setEnvelopeId(e.target.value)}>
              <option value="">— None —</option>
              {envelopes.map(env => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
            {envelopeId && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Marking this item as "Paid/Completed" will automatically log a transaction in this envelope.
              </div>
            )}
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <input
              className="input"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Account #, links, notes…"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <input
              id="autopay"
              type="checkbox"
              checked={autoPay}
              onChange={e => setAutoPay(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="autopay" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Auto-pay / Auto-deposit
              </label>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Just an indicator for your own records</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Saving…' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
